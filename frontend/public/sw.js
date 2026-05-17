// DubTab Service Worker — handles Web Share Target POST requests
const SHARE_CACHE = 'dubtab-share-v1';
const SHARE_TTL_MS = 10 * 60 * 1000; // 10 minutes — long enough for the user to pick a room

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/share' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }
  // Retrieve cached share data for the SharePage
  if (url.pathname.startsWith('/share-data/') && event.request.method === 'GET') {
    event.respondWith(
      caches.open(SHARE_CACHE).then(async (cache) => {
        const match = await cache.match(event.request);
        return match || new Response('', { status: 404 });
      })
    );
    return;
  }
});

// Parse the timestamp prefix from a share key (base36 of Date.now())
function keyTimestamp(key) {
  const ms = parseInt(key.split('-')[0] || key, 36);
  return Number.isFinite(ms) ? ms : 0;
}

// Drop cache entries older than SHARE_TTL_MS
async function purgeOldEntries(cache) {
  const keys = await cache.keys();
  const now = Date.now();
  await Promise.all(keys.map(async (req) => {
    const path = new URL(req.url).pathname; // /share-data/<key>/...
    const parts = path.split('/');
    const shareKey = parts[2] || '';
    const ts = keyTimestamp(shareKey);
    if (ts && now - ts > SHARE_TTL_MS) {
      await cache.delete(req);
    }
  }));
}

async function handleShareTarget(request) {
  const formData = await request.formData();
  const text = formData.get('text') || '';
  const title = formData.get('title') || '';
  const url = formData.get('url') || '';
  const files = formData.getAll('files').filter(f => f instanceof File && f.size > 0);

  const cache = await caches.open(SHARE_CACHE);
  await purgeOldEntries(cache);  // best-effort cleanup of stale shares

  // Use Date.now() as base36 prefix so we can age out later by parsing the key
  const key = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);

  const meta = { text, title, url, fileCount: files.length, fileNames: files.map(f => f.name), fileTypes: files.map(f => f.type) };
  await cache.put(
    `/share-data/${key}/meta`,
    new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } })
  );

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buf = await file.arrayBuffer();
    await cache.put(
      `/share-data/${key}/file/${i}`,
      new Response(buf, { headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Filename': file.name } })
    );
  }

  return Response.redirect(`/share?key=${key}`, 303);
}

// Allow the SharePage to explicitly delete its share data after upload completes
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'purge-share' && event.data.key) {
    const cache = await caches.open(SHARE_CACHE);
    const keys = await cache.keys();
    await Promise.all(keys
      .filter(req => new URL(req.url).pathname.startsWith(`/share-data/${event.data.key}/`))
      .map(req => cache.delete(req)));
  }
});
