import { useState, useRef } from 'react';
import { Mic, Square, Palette, SendHorizontal, ClipboardPaste } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface BottomInputBarProps {
  newNote: string;
  onNoteChange: (value: string) => void;
  onNoteSubmit: (e: React.FormEvent) => void;
  onVoiceSubmit: (file: File) => void;
  onOpenCanvas: () => void;
  onPasteRequest: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// Detect best supported audio MIME type
function getSupportedMimeType(): { mimeType: string; ext: string } {
  const candidates = [
    { mimeType: 'audio/webm', ext: '.webm' },
    { mimeType: 'audio/mp4', ext: '.m4a' },
    { mimeType: 'audio/ogg', ext: '.ogg' },
    { mimeType: 'audio/wav', ext: '.wav' },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return candidates[0]; // fallback
}

export function BottomInputBar({
  newNote,
  onNoteChange,
  onNoteSubmit,
  onVoiceSubmit,
  onOpenCanvas,
  onPasteRequest,
  showToast,
}: BottomInputBarProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { t } = useLanguage();

  const toggleRecording = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showToast(t('micBlocked'), 'error');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const { mimeType, ext } = getSupportedMimeType();
        
        let mediaRecorder: MediaRecorder;
        try {
          mediaRecorder = new MediaRecorder(stream, { mimeType });
        } catch {
          // If explicit mimeType fails, try without it
          mediaRecorder = new MediaRecorder(stream);
        }
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
          const actualMime = mediaRecorder.mimeType || mimeType;
          const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
          const actualExt = actualMime.includes('mp4') ? '.m4a' : actualMime.includes('ogg') ? '.ogg' : actualMime.includes('wav') ? '.wav' : ext;
          const file = new File([audioBlob], `voice-${Date.now()}${actualExt}`, { type: actualMime });
          onVoiceSubmit(file);
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access denied", err);
        showToast(t('micDenied'), 'error');
      }
    }
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 inset-x-0 z-30 pointer-events-none flex justify-center px-4 pb-safe">
      <div className="w-full max-w-3xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/60 dark:border-slate-700/60 rounded-[2rem] p-2 sm:p-3 pointer-events-auto transition-all">
        <form onSubmit={onNoteSubmit} className="flex items-end gap-2">
          <button
            type="button"
            onClick={onPasteRequest}
            className="p-3 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors bg-slate-50/50 dark:bg-slate-900/50 rounded-[1.25rem] hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 active:scale-95 shrink-0"
            title={t('pasteFromClipboard')}
          >
            <ClipboardPaste size={22} strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={onOpenCanvas}
            className="p-3 text-slate-400 dark:text-slate-500 hover:text-pink-500 dark:hover:text-pink-400 transition-colors bg-slate-50/50 dark:bg-slate-900/50 rounded-[1.25rem] hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 active:scale-95 shrink-0"
            title={t('openCanvas')}
          >
            <Palette size={22} strokeWidth={2} />
          </button>

          <div className="flex-1 relative bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 rounded-[1.25rem] flex items-end transition-all focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-indigo-300 dark:focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50/50 dark:focus-within:ring-indigo-500/20 overflow-hidden">
            <textarea
              value={newNote}
              onChange={e => onNoteChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (newNote.trim()) onNoteSubmit(e as any);
                }
              }}
              disabled={isRecording}
              placeholder={isRecording ? t('dictationStartText') : t('writeNote')}
              className={`w-full bg-transparent outline-none px-4 py-3.5 max-h-32 min-h-[52px] resize-none custom-scrollbar text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                isRecording ? 'text-red-500 dark:text-red-400 placeholder:text-red-400 dark:placeholder:text-red-500' : ''
              }`}
              rows={1}
            />
          </div>

          {newNote.trim() ? (
            <button
              type="submit"
              className="p-3 bg-indigo-600 text-white rounded-[1.25rem] hover:bg-indigo-700 dark:hover:bg-indigo-500 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/20 active:scale-95 shrink-0 animate-in zoom-in duration-200"
              title={t('sendText')}
            >
              <SendHorizontal size={22} strokeWidth={2.5} className="ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-3 rounded-[1.25rem] border transition-all shrink-0 active:scale-95 ${
                isRecording 
                  ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 animate-pulse shadow-inner' 
                  : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-800'
              }`}
              title={t('voiceMessage')}
            >
              {isRecording ? <Square size={22} className="fill-red-600 dark:fill-red-400" /> : <Mic size={22} strokeWidth={2} />}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}