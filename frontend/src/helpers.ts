// ---- Pure utility helpers (no JSX) ----

export function timeAgo(ts: number, lang: 'RU' | 'EN' = 'RU'): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (lang === 'EN') {
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
  if (diff < 5) return 'только что';
  if (diff < 60) return `${diff} сек. назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  return `${Math.floor(diff / 86400)} дн. назад`;
}

export function fallbackCopyTextToClipboard(text: string) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback: unable to copy', err);
  }
  document.body.removeChild(textArea);
}

export function copyToClipboard(content: string): void {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(content).catch(() => fallbackCopyTextToClipboard(content));
  } else {
    fallbackCopyTextToClipboard(content);
  }
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 10);
  }
  return Math.random().toString(36).substring(2, 12);
}
