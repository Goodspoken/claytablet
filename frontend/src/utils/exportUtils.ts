import JSZip from 'jszip';
import type { ClipboardItem, ChatMsg } from '../types';

const formatDate = (locale: string) => {
  const now = new Date();
  return {
    dateStr: now.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    timeStr: now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
  };
};

const formatTime = (ts: number, locale: string) =>
  new Date(ts * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

export const downloadAsTxt = (roomId: string, items: ClipboardItem[], chats: ChatMsg[], locale = 'ru-RU') => {
  const { dateStr, timeStr } = formatDate(locale);
  const baseUrl = window.location.origin;

  const lines: string[] = [];
  lines.push(`=== ClayTablet — Room: ${roomId} ===`);
  lines.push(`Date: ${dateStr} ${timeStr}`);
  lines.push('');

  const texts = items.filter(i => i.type === 'text');
  const images = items.filter(i => i.type === 'image');
  const audios = items.filter(i => i.type === 'audio');

  if (texts.length > 0) {
    lines.push('--- Notes ---');
    texts.forEach(t => {
      lines.push(`[${formatTime(t.timestamp, locale)}] ${t.content}`);
      lines.push('');
    });
  }

  if (images.length > 0) {
    lines.push('--- Images ---');
    images.forEach(img => {
      lines.push(`[${formatTime(img.timestamp, locale)}] ${img.filename || 'image'} — ${baseUrl}${img.url}`);
    });
    lines.push('');
  }

  if (audios.length > 0) {
    lines.push('--- Audio ---');
    audios.forEach(aud => {
      lines.push(`[${formatTime(aud.timestamp, locale)}] ${aud.filename || 'audio'} — ${baseUrl}${aud.url}`);
    });
    lines.push('');
  }

  if (chats.length > 0) {
    lines.push('--- Chat ---');
    chats.forEach(msg => {
      lines.push(`[${formatTime(msg.timestamp, locale)}] ${msg.author}: ${msg.text}`);
    });
  }

  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `claytablet_${roomId}_${dateStr.replace(/\./g, '-')}.txt`);
};

export const downloadAsMd = (roomId: string, items: ClipboardItem[], chats: ChatMsg[], locale = 'ru-RU') => {
  const { dateStr, timeStr } = formatDate(locale);
  const baseUrl = window.location.origin;

  const lines: string[] = [];
  lines.push(`# ClayTablet — Room: ${roomId}`);
  lines.push(`*Export Date: ${dateStr} ${timeStr}*`);
  lines.push('');

  const texts = items.filter(i => i.type === 'text');
  const images = items.filter(i => i.type === 'image');
  const audios = items.filter(i => i.type === 'audio');

  if (texts.length > 0) {
    lines.push('## Notes');
    texts.forEach(t => {
      lines.push(`**[${formatTime(t.timestamp, locale)}]**`);
      lines.push(`${t.content}`);
      lines.push('');
    });
  }

  if (images.length > 0) {
    lines.push('## Images');
    images.forEach(img => {
      lines.push(`**[${formatTime(img.timestamp, locale)}]** ${img.filename || 'image'}`);
      lines.push(`![${img.filename}](${baseUrl}${img.url})`);
      lines.push('');
    });
  }

  if (audios.length > 0) {
    lines.push('## Audio');
    audios.forEach(aud => {
      lines.push(`**[${formatTime(aud.timestamp, locale)}]** [Listen to Audio](${baseUrl}${aud.url})`);
      lines.push('');
    });
  }

  if (chats.length > 0) {
    lines.push('## Chat');
    chats.forEach(msg => {
      lines.push(`- **[${formatTime(msg.timestamp, locale)}] ${msg.author}**: ${msg.text}`);
    });
  }

  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `claytablet_${roomId}_${dateStr.replace(/\./g, '-')}.md`);
};

export const downloadAsZip = async (roomId: string, items: ClipboardItem[], chats: ChatMsg[], locale = 'ru-RU') => {
  const zip = new JSZip();
  const { dateStr } = formatDate(locale);

  // Generate MD and TXT, add to zip
  // (Reusing the text generation logic slightly inline to avoid complex returns)
  const texts = items.filter(i => i.type === 'text');
  const images = items.filter(i => i.type === 'image');
  const audios = items.filter(i => i.type === 'audio');
  
  let mdContent = `# ClayTablet — Room: ${roomId}\n\n`;
  if (texts.length > 0) {
    mdContent += '## Notes\n';
    texts.forEach(t => { mdContent += `**[${formatTime(t.timestamp, locale)}]**\n${t.content}\n\n`; });
  }

  const mediaPromises: Promise<void>[] = [];
  
  if (images.length > 0) {
    mdContent += '## Images\n';
    images.forEach(img => {
      if (!img.url) return;
      const filename = img.filename || `image_${img.id}.png`;
      mdContent += `**[${formatTime(img.timestamp, locale)}]** ${filename}\n![${filename}](./media/${filename})\n\n`;
      
      mediaPromises.push(
        fetch(img.url).then(r => r.blob()).then(blob => {
          zip.file(`media/${filename}`, blob);
        }).catch(e => console.error('Failed to fetch image for ZIP', e))
      );
    });
  }

  if (audios.length > 0) {
    mdContent += '## Audio\n';
    audios.forEach(aud => {
      if (!aud.url) return;
      const filename = aud.filename || `audio_${aud.id}.webm`;
      mdContent += `**[${formatTime(aud.timestamp, locale)}]** [Audio](./media/${filename})\n\n`;
      
      mediaPromises.push(
        fetch(aud.url).then(r => r.blob()).then(blob => {
          zip.file(`media/${filename}`, blob);
        }).catch(e => console.error('Failed to fetch audio for ZIP', e))
      );
    });
  }

  if (chats.length > 0) {
    mdContent += '## Chat\n';
    chats.forEach(msg => {
      mdContent += `- **[${formatTime(msg.timestamp, locale)}] ${msg.author}**: ${msg.text}\n`;
    });
  }

  zip.file('board.md', mdContent);

  // Wait for all media files to be fetched
  await Promise.all(mediaPromises);

  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, `claytablet_${roomId}_${dateStr.replace(/\./g, '-')}.zip`);
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
