import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Type, SendHorizontal } from 'lucide-react';
import type { ChatMsg } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ChatSidebarProps {
  chats: ChatMsg[];
  username: string;
  isOpen: boolean;
  isReadOnly?: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onSetUsername: (name: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function ChatSidebar({ chats, username, isOpen, isReadOnly = false, onClose, onSendMessage, onSetUsername, showToast }: ChatSidebarProps) {
  const [chatInput, setChatInput] = useState('');
  const [localUsername, setLocalUsername] = useState(username);
  const [isUsernameSet, setIsUsernameSet] = useState(!!username);
  const [prevUsername, setPrevUsername] = useState(username);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  if (username !== prevUsername) {
    setPrevUsername(username);
    setLocalUsername(username);
    setIsUsernameSet(!!username);
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats, isOpen]);

  const saveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (localUsername.trim()) {
      onSetUsername(localUsername.trim());
      setIsUsernameSet(true);
      showToast(t('nameSaved'));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !isUsernameSet) return;
    onSendMessage(chatInput);
    setChatInput('');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* F3: Mobile backdrop — tap outside to close on small screens */}
      <div
        className="sm:hidden fixed inset-0 bg-slate-900/50 z-10 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <aside className="w-80 lg:w-96 border-l border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.03)] dark:shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.3)] z-20 absolute right-0 sm:relative">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <h2 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <MessageSquare size={18} className="text-indigo-500 dark:text-indigo-400" /> {t('chatTitle')}
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-white dark:bg-slate-800 p-1 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
          <X size={16} />
        </button>
      </div>

      {isUsernameSet && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>{t('chatActiveAs')}: <strong className="text-slate-700 dark:text-slate-200">{username}</strong></span>
          <button
            type="button"
            onClick={() => setIsUsernameSet(false)}
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold cursor-pointer"
          >
            {t('chatEditName')}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
        {!isUsernameSet ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-full mb-4 text-indigo-500 dark:text-indigo-400">
              <Type size={32} />
            </div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">
              {t('welcomeChat')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {t('chatIntroText')}
            </p>
            <form onSubmit={saveUsername} className="w-full">
              <input
                type="text"
                value={localUsername}
                onChange={e => setLocalUsername(e.target.value)}
                placeholder={t('yourNamePlaceholder')}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-500 shadow-sm mb-3 text-center text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                autoFocus
              />
              <button type="submit" disabled={!localUsername.trim()} className="w-full bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 text-white font-medium py-2 rounded-lg transition-colors text-sm">
                {t('startChatting')}
              </button>
            </form>
          </div>
        ) : (
          <>
            {chats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-4 text-center">
                <MessageSquare size={32} className="mb-3 opacity-20" />
                <p className="text-sm">{t('chatEmpty')}</p>
                <p className="text-xs mt-1">{t('chatBeFirst')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {chats.map((msg, i) => {
                  const isMe = msg.author === username;
                  const showHeader = i === 0 || chats[i-1].author !== msg.author || (msg.timestamp - chats[i-1].timestamp > 300);
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showHeader && (
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="font-medium text-xs text-slate-500 dark:text-slate-400">{isMe ? t('youLabel') : msg.author}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(msg.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      )}
                      <div className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] break-words ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm shadow-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-sm shadow-sm'}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </>
        )}
      </div>

      {isUsernameSet && !isReadOnly && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={t('chatPlaceholder')}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <button type="submit" disabled={!chatInput.trim()} className="bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white dark:disabled:text-slate-500 w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0">
              <SendHorizontal size={18} />
            </button>
          </form>
        </div>
      )}
    </aside>
    </>
  );
}
