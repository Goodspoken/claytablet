import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, Image, FileText, Link, CheckCircle, Loader, ArrowLeft } from 'lucide-react';
import { addText, addImage, addFile, addAudio } from '../api';
import { useLanguage } from '../contexts/LanguageContext';

interface ShareMeta {
  text: string;
  title: string;
  url: string;
  fileCount: number;
  fileNames: string[];
  fileTypes: string[];
}

async function getShareMeta(key: string): Promise<ShareMeta | null> {
  try {
    const res = await fetch(`/share-data/${key}/meta`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getShareFile(key: string, index: number): Promise<File | null> {
  try {
    const res = await fetch(`/share-data/${key}/file/${index}`);
    if (!res.ok) return null;
    const blob = await res.blob();
    const name = res.headers.get('X-Filename') || `file_${index}`;
    const type = res.headers.get('Content-Type') || blob.type;
    return new File([blob], name, { type });
  } catch {
    return null;
  }
}

function getRecentRooms(): string[] {
  try {
    return JSON.parse(localStorage.getItem('recentRooms') || '[]');
  } catch {
    return [];
  }
}

export default function SharePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const key = searchParams.get('key') || '';

  const [meta, setMeta] = useState<ShareMeta | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [recentRooms, setRecentRooms] = useState<string[]>([]);
  const [customRoom, setCustomRoom] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const createdUrls: string[] = [];

    (async () => {
      const m = await getShareMeta(key);
      if (cancelled) return;
      if (!m) { setError('Данные не найдены. Попробуй поделиться снова.'); return; }
      setMeta(m);

      const loadedFiles: File[] = [];
      for (let i = 0; i < m.fileCount; i++) {
        const f = await getShareFile(key, i);
        if (f) loadedFiles.push(f);
      }
      if (cancelled) return;
      setFiles(loadedFiles);

      const urls = loadedFiles.map(f => {
        if (!f.type.startsWith('image/')) return '';
        const u = URL.createObjectURL(f);
        createdUrls.push(u);
        return u;
      });
      setPreviews(urls);
      setRecentRooms(getRecentRooms());
    })();

    return () => {
      cancelled = true;
      createdUrls.forEach(u => URL.revokeObjectURL(u));
    };
  }, [key]);

  const send = async (roomId: string) => {
    if (!roomId.trim()) return;
    setSending(true);
    setError('');
    try {
      const room = roomId.trim();
      // Send text/url
      const textContent = [meta?.title, meta?.text, meta?.url].filter(Boolean).join('\n').trim();
      if (textContent) await addText(room, textContent);
      // Send files
      for (const file of files) {
        if (file.type.startsWith('image/')) await addImage(room, file);
        else if (file.type.startsWith('audio/')) await addAudio(room, file);
        else {
          await addFile(room, file);
        }
      }
      navigator.serviceWorker?.controller?.postMessage({ type: 'purge-share', key });
      setDone(true);
      setTimeout(() => navigate(`/${room}`), 1200);
    } catch {
      setError(lang === 'RU' ? 'Ошибка отправки. Проверь ID комнаты.' : 'Send failed. Check the room ID.');
      setSending(false);
    }
  };

  if (!key) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {lang === 'RU' ? 'Открой эту страницу через «Поделиться» на телефоне.' : 'Open this page via the Share menu on your phone.'}
          </p>
          <button onClick={() => navigate('/')} className="mt-4 text-indigo-500 text-sm hover:underline flex items-center gap-1 mx-auto">
            <ArrowLeft size={14} /> {lang === 'RU' ? 'На главную' : 'Home'}
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
          <p className="text-slate-700 dark:text-slate-200 font-semibold">
            {lang === 'RU' ? 'Отправлено!' : 'Sent!'}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {lang === 'RU' ? 'Открываю комнату...' : 'Opening room...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-start justify-center p-4 pt-10">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {lang === 'RU' ? 'Отправить в ClayTablet' : 'Send to ClayTablet'}
            </h1>
            <p className="text-xs text-slate-400">
              {lang === 'RU' ? 'Выбери комнату' : 'Choose a room'}
            </p>
          </div>
        </div>

        {/* Preview */}
        {meta && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-5">
            {previews.filter(Boolean).length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {previews.map((url, i) => url ? (
                  <img key={i} src={url} alt="" className="h-24 w-24 object-cover rounded-xl" />
                ) : null)}
              </div>
            ) : null}

            {files.filter(f => !f.type.startsWith('image/')).map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-2">
                <FileText size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{f.name}</span>
              </div>
            ))}

            {(meta.text || meta.title) && (
              <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <FileText size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <span className="line-clamp-3">{[meta.title, meta.text].filter(Boolean).join(' — ')}</span>
              </div>
            )}
            {meta.url && (
              <div className="flex items-center gap-2 text-sm text-indigo-500 mt-1">
                <Link size={14} className="shrink-0" />
                <span className="truncate">{meta.url}</span>
              </div>
            )}
            {!meta.text && !meta.title && !meta.url && files.length === 0 && (
              <p className="text-sm text-slate-400">{lang === 'RU' ? 'Нет данных' : 'No content'}</p>
            )}
          </div>
        )}

        {/* Recent rooms */}
        {recentRooms.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
              {lang === 'RU' ? 'Последние комнаты' : 'Recent rooms'}
            </p>
            <div className="flex flex-col gap-2">
              {recentRooms.map(room => (
                <button
                  key={room}
                  onClick={() => send(room)}
                  disabled={sending}
                  className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-500 text-sm font-bold">
                      {room[0].toUpperCase()}
                    </div>
                    <span className="font-mono text-sm text-slate-700 dark:text-slate-200">{room}</span>
                  </div>
                  {sending
                    ? <Loader size={16} className="animate-spin text-slate-400" />
                    : <Send size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  }
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom room input */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            {lang === 'RU' ? 'Другая комната' : 'Other room'}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={lang === 'RU' ? 'ID комнаты...' : 'Room ID...'}
              value={customRoom}
              onChange={e => setCustomRoom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(customRoom)}
              className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400/50 font-mono placeholder:text-slate-400"
            />
            <button
              onClick={() => send(customRoom)}
              disabled={!customRoom.trim() || sending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {sending ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        {/* Image icon if only images */}
        {files.length > 0 && files.every(f => f.type.startsWith('image/')) && (
          <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 justify-center">
            <Image size={12} /> {files.length} {lang === 'RU' ? 'фото будет загружено' : 'photo(s) will be uploaded'}
          </div>
        )}
      </div>
    </div>
  );
}
