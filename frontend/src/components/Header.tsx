import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Plus, MessageSquare, Settings, Wifi, WifiOff, Lock, ChevronDown, Download, Globe, Sun, Moon, LogIn, LogOut, User, Mic, Square, Palette, SendHorizontal, ClipboardPaste, Paperclip } from 'lucide-react';
import type { RoomSettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './AuthModal';

interface HeaderProps {
  roomId: string;
  isConnected: boolean;
  isChatOpen: boolean;
  roomSettings: RoomSettings;
  recentRooms: string[];
  isReadOnly?: boolean;
  onToggleChat: () => void;
  onOpenSettings: () => void;
  onDownload: (fmt: 'txt' | 'md' | 'zip') => void;
  // Input bar props (moved from BottomInputBar)
  newNote: string;
  onNoteChange: (value: string) => void;
  onNoteSubmit: (e: React.FormEvent) => void;
  onVoiceSubmit: (file: File) => void;
  onOpenCanvas: () => void;
  onPasteRequest: () => void;
  onFileAttach: (files: FileList) => void;
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
  return candidates[0];
}

export function Header({
  roomId,
  isConnected,
  isChatOpen,
  roomSettings,
  recentRooms,
  isReadOnly = false,
  onToggleChat,
  onOpenSettings,
  onDownload,
  newNote,
  onNoteChange,
  onNoteSubmit,
  onVoiceSubmit,
  onOpenCanvas,
  onPasteRequest,
  onFileAttach,
  showToast,
}: HeaderProps) {
  const navigate = useNavigate();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [goToInput, setGoToInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, isLoading, logout } = useAuth();
  const isLocalServer = window.location.hostname !== 'claytablet.online' && window.location.hostname !== 'claytablet.ru';

  const closeAll = () => { setIsManageOpen(false); setIsLangOpen(false); setGoToInput(''); };
  const handleGoToRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const id = goToInput.trim();
    if (id) { closeAll(); navigate(`/${id}`); }
  };

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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileAttach(e.target.files);
      e.target.value = ''; // Reset so same file can be selected again
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm border-b border-slate-200/60 dark:border-slate-700/60 z-40">
      {/* Row 1: Logo, Status, Actions */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 relative">
        
        {/* Left Side: Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
            <img
              src="/logo-tablet-192.png"
              alt="ClayTablet"
              className="w-11 h-11 drop-shadow-sm shrink-0"
              width={44}
              height={44}
            />
            <h1 className="text-xl font-black tracking-tight hidden sm:block bg-gradient-to-r from-[#2d1056] via-[#6b3aa0] to-[#3a1e5c] dark:from-[#b58bff] dark:via-[#d4b0ff] dark:to-[#b58bff] bg-clip-text text-transparent">
              ClayTablet
            </h1>
          </div>
        </div>

        {/* Center: Status & ID */}
        <div className="flex-1 flex justify-center items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-[1rem] border border-slate-200/50 dark:border-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="opacity-50 select-none hidden sm:inline">ID:</span>
            <span className="font-mono text-xs sm:text-sm">{roomId}</span>
          </div>
          
          {roomSettings.is_protected && (
            <div className="px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-[1rem] border border-amber-200/50 dark:border-amber-700/50" title={t('protectedRoom')}>
              <Lock size={13} strokeWidth={2.5} />
            </div>
          )}

          <div
            className={`hidden md:flex items-center gap-1 px-2 py-1 rounded-[1rem] text-xs font-medium transition-colors border ${isConnected ? 'bg-green-50/50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800/50'}`}
            title={isConnected ? t('online') : t('offline')}
          >
            {isConnected ? <Wifi size={11} /> : <WifiOff size={11} className="animate-pulse" />}
            <span className="hidden xl:inline">{isConnected ? t('online') : t('offline')}</span>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center justify-end gap-1 sm:gap-1.5 shrink-0">

          {/* Auth Button */}
          {!isLocalServer && !isLoading && !user && (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="p-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800/50"
              title={t('login')}
            >
              <LogIn size={15} />
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors bg-slate-50/50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
            title={theme === 'light' ? t('themeDark') : t('themeLight')}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          
          {/* Language switcher (desktop) */}
          <div className="relative hidden md:block">
            <button
              onClick={() => { setIsLangOpen(!isLangOpen); setIsManageOpen(false); }}
              className={`p-2 transition-colors rounded-xl border border-transparent active:scale-95 flex items-center gap-1 px-2.5 ${isLangOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <Globe size={15} />
              <span className="text-xs font-bold">{lang}</span>
            </button>

            {isLangOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)}></div>
                <div className="absolute top-11 right-0 w-24 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-xl rounded-xl overflow-hidden z-50 py-1 animate-in slide-in-from-top-2 duration-200">
                  <button onClick={() => { setLang('RU'); setIsLangOpen(false); }} className={`w-full text-center px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${lang === 'RU' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>RU</button>
                  <button onClick={() => { setLang('EN'); setIsLangOpen(false); }} className={`w-full text-center px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${lang === 'EN' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>EN</button>
                </div>
              </>
            )}
          </div>

          {/* Room manage dropdown */}
          <div className="relative">
            <button
              onClick={() => { setIsManageOpen(!isManageOpen); setIsLangOpen(false); }}
              className={`p-2 transition-colors rounded-[1rem] border border-transparent active:scale-95 flex items-center gap-1.5 px-2.5 ${isManageOpen ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50' : 'text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <span className="hidden sm:inline text-sm font-medium">{t('room')}</span>
              <ChevronDown size={13} className={`transition-transform opacity-50 ${isManageOpen ? 'rotate-180' : ''}`} />
            </button>

            {isManageOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeAll}></div>
                <div className="absolute top-11 right-0 w-64 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-xl rounded-2xl overflow-hidden z-50 py-2 animate-in slide-in-from-top-2 duration-200 flex flex-col">
                  
                  <Link to="/" className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-green-600 dark:hover:text-green-400 flex items-center gap-3 transition-colors">
                    <Plus size={16} /> {t('createNew')}
                  </Link>

                  {/* Go to room */}
                  <form onSubmit={handleGoToRoom} className="px-3 py-1.5 flex gap-1.5">
                    <input
                      value={goToInput}
                      onChange={e => setGoToInput(e.target.value)}
                      placeholder={t('goToRoomPlaceholder')}
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-400/50 text-slate-700 dark:text-slate-200"
                    />
                    <button
                      type="submit"
                      disabled={!goToInput.trim()}
                      className="px-2.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      {t('goToRoom')}
                    </button>
                  </form>

                  <button
                    onClick={() => { closeAll(); onToggleChat(); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${isChatOpen ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <MessageSquare size={16} /> {t('chatRoom')}
                  </button>
                  
                  <button onClick={() => { closeAll(); onDownload('txt'); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-3 transition-colors">
                    <Download size={16} /> {t('downloadTxt')}
                  </button>
                  
                  <button onClick={() => { closeAll(); onDownload('md'); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-3 transition-colors">
                    <Download size={16} /> {t('downloadMd')}
                  </button>

                  <button onClick={() => { closeAll(); onDownload('zip'); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-3 transition-colors">
                    <Download size={16} /> {t('downloadZip')}
                  </button>

                  {/* Language switcher (mobile) */}
                  <div className="md:hidden">
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-2"></div>
                    <div className="px-4 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe size={12} /> {lang === 'RU' ? 'Язык' : 'Language'}
                    </div>
                    <div className="flex gap-1 px-4 pb-2">
                      <button onClick={() => { setLang('RU'); closeAll(); }} className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors ${lang === 'RU' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>RU</button>
                      <button onClick={() => { setLang('EN'); closeAll(); }} className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors ${lang === 'EN' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>EN</button>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-2"></div>
                  
                  <div className="px-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={12} /> {t('historyTitle')}
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto custom-scrollbar flex-1">
                    {recentRooms.length === 0 && (!user) ? (
                      <p className="px-4 py-2 text-sm text-slate-400">{t('historyEmpty')}</p>
                    ) : (
                      <>
                        {user && (
                           <div className="px-4 py-2 mb-1 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 text-xs rounded-xl mx-2 flex items-center gap-2">
                             {user.picture ? (
                               <img src={user.picture} alt="" className="w-5 h-5 rounded-full" />
                             ) : (
                               <User size={12} />
                             )}
                             <span className="truncate">{user.name}</span>
                           </div>
                        )}
                        {recentRooms.map(id => (
                          <button
                            key={id}
                            onClick={() => {
                              closeAll();
                              if (id !== roomId) navigate(`/${id}`);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-between group ${id === roomId ? 'bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}
                          >
                            <span className="truncate pr-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{id}</span>
                            {id === roomId && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded shrink-0">{t('current')}</span>}
                          </button>
                        ))}
                      </>
                    )}
                  </div>

                  {user && (
                    <>
                      <div className="h-px bg-slate-100 dark:bg-slate-700 my-2"></div>
                      <button onClick={() => { closeAll(); logout(); }} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors">
                        <LogOut size={16} /> {t('logout')}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors bg-slate-50/50 dark:bg-slate-800/50 rounded-[1rem] hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 active:scale-95"
            title={t('settingsTitle')}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Row 2: Input Toolbar (hidden in read-only mode) */}
      <div className={`max-w-[1920px] mx-auto px-4 sm:px-6 pb-2.5 ${isReadOnly ? 'hidden' : ''}`}>
        <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-[1.25rem] border border-slate-200/60 dark:border-slate-700/60 p-1.5 sm:p-2">
          <form onSubmit={onNoteSubmit} className="flex items-end gap-1.5">
            <button
              type="button"
              onClick={onPasteRequest}
              className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors rounded-xl hover:bg-white dark:hover:bg-slate-700 active:scale-95 shrink-0"
              title={t('pasteFromClipboard')}
            >
              <ClipboardPaste size={20} strokeWidth={2} />
            </button>

            {/* File attach button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors rounded-xl hover:bg-white dark:hover:bg-slate-700 active:scale-95 shrink-0"
              title={t('attachFile')}
            >
              <Paperclip size={20} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={onOpenCanvas}
              className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-pink-500 dark:hover:text-pink-400 transition-colors rounded-xl hover:bg-white dark:hover:bg-slate-700 active:scale-95 shrink-0 hidden sm:block"
              title={t('openCanvas')}
            >
              <Palette size={20} strokeWidth={2} />
            </button>

            <div className="flex-1 relative bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex items-end transition-all focus-within:border-indigo-300 dark:focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-50/50 dark:focus-within:ring-indigo-500/20 overflow-hidden">
              <textarea
                value={newNote}
                onChange={e => onNoteChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newNote.trim()) onNoteSubmit(e as unknown as React.FormEvent);
                  }
                }}
                disabled={isRecording}
                placeholder={isRecording ? t('dictationStartText') : t('writeNote')}
                className={`w-full bg-transparent outline-none px-3 py-2.5 max-h-24 min-h-[40px] resize-none custom-scrollbar text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                  isRecording ? 'text-red-500 dark:text-red-400 placeholder:text-red-400 dark:placeholder:text-red-500' : ''
                }`}
                rows={1}
              />
            </div>

            {newNote.trim() ? (
              <button
                type="submit"
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-500 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/20 active:scale-95 shrink-0 animate-in zoom-in duration-200"
                title={t('sendText')}
              >
                <SendHorizontal size={20} strokeWidth={2.5} className="ml-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleRecording}
                className={`p-2.5 rounded-xl border transition-all shrink-0 active:scale-95 ${
                  isRecording 
                    ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 animate-pulse shadow-inner' 
                    : 'bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-800'
                }`}
                title={t('voiceMessage')}
              >
                {isRecording ? <Square size={20} className="fill-red-600 dark:fill-red-400" /> : <Mic size={20} strokeWidth={2} />}
              </button>
            )}
          </form>
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
}
