// ---- JSX helpers ----
// Pure utility functions have been moved to utils.ts

// Re-export pure utils for backward compatibility
export { timeAgo, fallbackCopyTextToClipboard, copyToClipboard, generateId } from './helpers';

export function linkify(text: string): React.ReactNode[] {
  const splitRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(splitRegex);
  return parts.map((part, i) => {
    const testRegex = /^https?:\/\/[^\s<]+$/;
    return testRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 underline underline-offset-2 break-all">{part}</a>
      : part;
  });
}
