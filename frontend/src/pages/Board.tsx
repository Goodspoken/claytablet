import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBoardStore } from '../stores/useBoardStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../contexts/LanguageContext';
import { downloadAsTxt, downloadAsMd, downloadAsZip } from '../utils/exportUtils';
import { copyToClipboard } from '../helpers';

import { Header } from '../components/Header';
import { CardGrid } from '../components/CardGrid';
import { ChatSidebar } from '../components/ChatSidebar';
import { SettingsModal } from '../components/SettingsModal';
import { QRModal } from '../components/QRModal';
import { CanvasModal } from '../components/CanvasModal';
import { DragOverlay } from '../components/DragOverlay';
import { ToastContainer } from '../components/ToastContainer';
import { PasswordPrompt } from '../components/PasswordPrompt';
import { AuthModal } from '../components/AuthModal';

export default function Board() {
  const { roomId } = useParams<{ roomId: string }>();
  const { toasts, showToast } = useToast();
  const { lang, t } = useLanguage();
  const locale = lang === 'EN' ? 'en-GB' : 'ru-RU';
  const dragCounter = useRef(0);

  // --- Store ---
  const store = useBoardStore();

  // --- Filter and Sort ---
  const [filter, setFilter] = useState<'all' | 'image' | 'other'>('all');

  const filteredItems = useMemo(() => {
    if (filter === 'image') {
      return store.items.filter(item => item.type === 'image');
    }
    if (filter === 'other') {
      return store.items.filter(item => item.type !== 'image');
    }
    return store.items;
  }, [store.items, filter]);

  // --- Sync roomId into store ---
  useEffect(() => {
    store.setRoomId(roomId || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // --- Initial data fetch + room history ---
  useEffect(() => {
    store.fetchData();
    store.saveRoomToHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // --- Auth event listeners ---
  useEffect(() => {
    const onPasswordRequired = () => store.setIsPasswordPromptOpen(true);
    const onAuthRequired = () => store.setIsAuthModalOpen(true);
    window.addEventListener('password:required', onPasswordRequired);
    window.addEventListener('auth:required', onAuthRequired);
    return () => {
      window.removeEventListener('password:required', onPasswordRequired);
      window.removeEventListener('auth:required', onAuthRequired);
    };
  }, [store]);

  // --- WebSocket ---
  const { isConnected } = useWebSocket({ roomId, onSync: store.fetchData });

  // --- Timestamp ticker (for "x min ago") ---
  useEffect(() => {
    const ticker = setInterval(() => useBoardStore.setState({}), 30_000);
    return () => clearInterval(ticker);
  }, []);

  // --- Global paste handler ---
  useEffect(() => {
    const handler = (e: ClipboardEvent) => store.handlePasteEvent(e, showToast, t);
    window.addEventListener('paste', handler as unknown as EventListener);
    return () => window.removeEventListener('paste', handler as unknown as EventListener);
  }, [store, showToast, t]);

  // --- Escape closes modals ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') store.closeAllModals();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store]);

  // --- Drag & Drop ---
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    store.setIsDragging(true);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      store.setIsDragging(false);
    }
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    store.setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await store.uploadFiles(Array.from(e.dataTransfer.files), showToast, t);
    }
  };

  // --- Bound actions (pass toast/t) ---
  const handleNoteSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    store.addTextNote(showToast, t);
  }, [store, showToast, t]);

  const handleDownload = useCallback((fmt: 'txt' | 'md' | 'zip') => {
    if (!roomId) return;
    if (fmt === 'txt') {
      downloadAsTxt(roomId, store.items, store.chats, locale);
      showToast(t('downloaded'), 'success');
    } else if (fmt === 'md') {
      downloadAsMd(roomId, store.items, store.chats, locale);
      showToast(t('downloaded'), 'success');
    } else if (fmt === 'zip') {
      showToast(t('zipPreparing'), 'info');
      downloadAsZip(roomId, store.items, store.chats, locale).then(() => {
        showToast(t('downloaded'), 'success');
      }).catch(() => {
        showToast(t('uploadError'), 'error');
      });
    }
  }, [roomId, store.items, store.chats, showToast, t, locale]);

  // --- Read-only: guest can't write ---
  const isReadOnly = useMemo(
    () => !!store.roomSettings.is_readonly && !store.roomSettings.is_owner,
    [store.roomSettings.is_readonly, store.roomSettings.is_owner]
  );

  // --- Render ---
  return (
    <div
      className={`w-screen h-screen flex flex-col font-sans bg-[#f4f5f7] dark:bg-slate-900 relative transition-colors duration-300 overflow-hidden ${store.isDragging && !isReadOnly ? 'bg-blue-50/50 dark:bg-indigo-900/30' : ''}`}
      onDrop={isReadOnly ? undefined : handleDrop}
      onDragOver={isReadOnly ? undefined : handleDragOver}
      onDragEnter={isReadOnly ? undefined : handleDragEnter}
      onDragLeave={isReadOnly ? undefined : handleDragLeave}
    >
      <Header
        roomId={roomId || ''}
        isConnected={isConnected}
        isChatOpen={store.isChatOpen}
        roomSettings={store.roomSettings}
        recentRooms={store.recentRooms}
        isReadOnly={isReadOnly}
        onToggleChat={() => store.setIsChatOpen(!store.isChatOpen)}
        onOpenSettings={() => store.setIsSettingsOpen(true)}
        onDownload={handleDownload}
        newNote={store.newNote}
        onNoteChange={store.setNewNote}
        onNoteSubmit={handleNoteSubmit}
        onVoiceSubmit={(f) => store.handleVoiceSubmit(f, showToast, t)}
        onOpenCanvas={() => store.setIsCanvasOpen(true)}
        onPasteRequest={() => store.handleManualPaste(showToast, t)}
        onFileAttach={(files) => store.uploadFiles(Array.from(files), showToast, t)}
        showToast={showToast}
      />

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="fixed top-[120px] left-0 right-0 z-30 flex justify-center pointer-events-none px-4">
          <div className="mt-2 flex items-center gap-2 px-4 py-2 bg-violet-50 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-700 rounded-full text-violet-700 dark:text-violet-300 text-sm font-medium shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            {t('readOnlyBadge')} — {t('readOnlyHint')}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 pt-[120px] flex overflow-hidden">
        <main className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar relative z-10 w-full h-full cursor-default">
          {/* Filter Bar */}
          <div className="flex items-center justify-between mb-6 max-w-[1920px] mx-auto px-1">
            <div className="flex bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t('filterAll')}
              </button>
              <button
                onClick={() => setFilter('image')}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  filter === 'image'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t('filterImages')}
              </button>
              <button
                onClick={() => setFilter('other')}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  filter === 'other'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t('filterOther')}
              </button>
            </div>
            
            <div className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-white/40 dark:bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-200/30 dark:border-slate-700/30 select-none">
              {filteredItems.length}
            </div>
          </div>

          <CardGrid
            items={filteredItems}
            copiedId={store.copiedId}
            isReadOnly={isReadOnly}
            onCopy={(content, id) => store.handleCopy(content, showToast, t, id)}
            onShare={(item) => store.handleShare(item, showToast, t)}
             onCopyImage={async (url) => {
              const absoluteUrl = window.location.origin + url;
              try {
                if (!navigator.clipboard || !navigator.clipboard.write) {
                  throw new Error('Clipboard write API not available');
                }
                const res = await fetch(url);
                const blob = await res.blob();
                const mimeType = blob.type.startsWith('image/') ? blob.type : 'image/png';
                const textBlob = new Blob([absoluteUrl], { type: 'text/plain' });
                await navigator.clipboard.write([
                  new ClipboardItem({
                    [mimeType]: blob,
                    'text/plain': textBlob
                  })
                ]);
                showToast(t('copied'), 'success');
              } catch (err) {
                console.warn('Failed to copy image blob, copying URL instead:', err);
                copyToClipboard(absoluteUrl);
                showToast(t('linkCopied'), 'success');
              }
            }}
            onDelete={(id) => store.handleDelete(id, showToast, t)}
          />
        </main>

        <ChatSidebar
          chats={store.chats}
          username={store.username}
          isOpen={store.isChatOpen}
          isReadOnly={isReadOnly}
          onClose={() => store.setIsChatOpen(false)}
          onSendMessage={(text) => store.handleChatSend(text, showToast, t)}
          onSetUsername={store.handleSetUsername}
          showToast={showToast}
        />
      </div>

      <SettingsModal
        isOpen={store.isSettingsOpen}
        currentSettings={store.roomSettings}
        onClose={() => store.setIsSettingsOpen(false)}
        onClearAll={() => store.handleClearAll(showToast, t)}
        onUpdateSettings={(s) => store.handleUpdateSettings(s, showToast, t)}
        onOpenQR={() => store.setIsQROpen(true)}
        onCopyLink={() => store.handleCopy(window.location.href, showToast, t)}
      />

      <QRModal
        isOpen={store.isQROpen}
        url={window.location.href}
        onClose={() => store.setIsQROpen(false)}
      />

      <CanvasModal
        isOpen={store.isCanvasOpen}
        onClose={() => store.setIsCanvasOpen(false)}
        onSave={(f) => store.handleCanvasSubmit(f, showToast, t)}
      />

      {store.isPasswordPromptOpen && roomId && (
        <PasswordPrompt
          roomId={roomId}
          onSuccess={() => {
            store.setIsPasswordPromptOpen(false);
            store.fetchData();
          }}
        />
      )}

      <AuthModal
        isOpen={store.isAuthModalOpen}
        onClose={() => store.setIsAuthModalOpen(false)}
        returnTo={window.location.pathname}
      />

      <DragOverlay isDragging={store.isDragging} />
      <ToastContainer toasts={toasts} />
    </div>
  );
}
