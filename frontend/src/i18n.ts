export type Language = 'RU' | 'EN';

export const translations = {
  RU: {
    // Header
    room: 'Комната',
    online: 'Онлайн',
    offline: 'Офлайн',
    chatRoom: 'Чат комнаты',
    createNew: 'Создать новую',
    downloadTxt: 'Скачать как TXT',
    downloadMd: 'Скачать как MD',
    downloadZip: 'Скачать архив ZIP',
    historyEmpty: 'История пуста',
    historyTitle: 'История',
    current: 'Текущая',
    themeLight: 'Светлая тема',
    themeDark: 'Тёмная тема',
    protectedRoom: 'Комната защищена паролем',
    
    // Board / Cards
    textAdded: 'Текст добавлен',
    imageAdded: 'Изображение добавлено',
    audioAdded: 'Аудио добавлено',
    uploadError: 'Ошибка отправки/загрузки',
    fileTypeWarning: 'Можно загружать только медиафайлы',
    filesUploaded: 'Загружено файл(ов):',
    copied: 'Скопировано!',
    linkCopied: 'Ссылка скопирована',
    deleted: 'Удалено',
    deleteError: 'Ошибка удаления',
    chatError: 'Ошибка отправки чата',
    settingsUpdated: 'Настройки обновлены',
    settingsUpdateError: 'Ошибка обновления настроек',
    boardCleared: 'Доска очищена',
    clearError: 'Ошибка очистки',
    confirmClear: 'Вы уверены, что хотите полностью очистить доску?',
    
    // BottomInputBar
    writeNote: 'Написать заметку...',
    openCanvas: 'Рисовать',
    dictationStartText: 'Слушаю... (отпустите кнопку для отправки)',
    pasteFromClipboard: 'Вставить из буфера',
    clipboardError: 'Ошибка доступа к буферу обмена',
    noSupportedDataInClipboard: 'В буфере нет текста или картинок',
    micBlocked: 'Доступ к микрофону заблокирован',
    micDenied: 'Нет доступа к микрофону',
    sendText: 'Отправить текст',
    voiceMessage: 'Голосовое сообщение',

    // Chat
    chatTitle: 'Чат комнаты',
    chatPlaceholder: 'Написать в чат...',
    usernamePrompt: 'Ваше имя для чата:',
    usernamePlaceholder: 'Нажмите Enter',
    welcomeChat: 'Добро пожаловать в Чат',
    chatIntroText: 'Введите ваше имя, чтобы начать общение с остальными участниками.',
    startChatting: 'Начать общение',
    yourNamePlaceholder: 'Ваше имя...',
    nameSaved: 'Имя сохранено',
    chatEmpty: 'Здесь пока пусто.',
    chatBeFirst: 'Оставьте сообщение первым!',
    youLabel: 'Вы',
    
    // Modals & Prompts
    settingsTitle: 'Настройки комнаты',
    autoDeleteLabel: 'Авто-очистка через:',
    never: 'Никогда',
    oneHour: '1 час',
    oneDay: '24 часа',
    oneWeek: '7 дней',
    passwordLabel: 'Пароль (оставьте пустым для удаления):',
    saveSettings: 'Сохранить',
    close: 'Закрыть',
    clearBoardAction: 'Очистить всю доску (Удалить все)',
    showQR: 'Показать QR-код',
    copyLink: 'Скопировать ссылку',
    
    passwordTitle: 'Вход в комнату',
    passwordEnterLabel: 'Введите пароль для доступа:',
    enterRoom: 'Войти',
    wrongPassword: 'Неверный пароль',

    // Canvas
    selectColor: 'Выбрать цвет',
    brush: 'Кисть',
    eraser: 'Ластик',
    clearCanvas: 'Очистить',
    lineWidth: 'Толщина',
    saveDrawing: 'Сохранить',

    // Cards
    boardEmpty: 'Доска пуста',
    orDragDrop: 'или перетащите файлы',
    copyAction: 'Копировать',
    shareAction: 'Поделиться',
    deleteAction: 'Удалить',
    downloadAction: 'Скачать',
    
    // QR
    qrTitle: 'QR-код комнаты',
    qrScanText: 'Отсканируйте камерой телефона',
    
    // Drag
    dropToUpload: 'Отпустите, чтобы загрузить',
    
    // Misc
    downloaded: 'Файл скачан',
    zipPreparing: 'Подготовка ZIP-архива...',
    unsupportedFormat: 'Формат не поддерживается',
    dropFilesHere: 'Бросайте файлы сюда',
    nothingFound: 'Здесь пока пусто. Создайте заметку или перетащите файлы.',
    // Auth
    login: 'Войти',
    logout: 'Выйти',
    loginDesc: 'Войдите, чтобы навсегда сохранить свои комнаты и синхронизировать их на всех устройствах.',
    privateRoomDesc: 'Это личная комната. Войдите в аккаунт владельца, чтобы получить доступ.',
    // Files
    attachFile: 'Прикрепить файл',
    fileAdded: 'Файл добавлен',
    // Password attempts
    tooManyAttempts: 'Слишком много попыток. Подождите',
    tryAgainIn: 'Повторите через',
    // Read-only mode
    readOnlyBadge: 'Только чтение',
    readOnlyHint: 'Владелец включил режим «только чтение». Вы можете просматривать, но не изменять доску.',
    readOnlyToggle: 'Режим «только чтение»',
    readOnlyToggleDesc: 'Гости смогут просматривать доску, но не смогут добавлять или удалять записи.',
    readOnlyError: 'Доска в режиме «только чтение»',
  },
  EN: {
    // Header
    room: 'Room',
    online: 'Online',
    offline: 'Offline',
    chatRoom: 'Room Chat',
    createNew: 'Create New',
    downloadTxt: 'Download as TXT',
    downloadMd: 'Download as Markdown',
    downloadZip: 'Download ZIP Archive',
    historyEmpty: 'History is empty',
    historyTitle: 'History',
    current: 'Current',
    themeLight: 'Light Theme',
    themeDark: 'Dark Theme',
    protectedRoom: 'Room is password protected',
    
    // Board / Cards
    textAdded: 'Text added',
    imageAdded: 'Image added',
    audioAdded: 'Audio added',
    uploadError: 'Upload/send error',
    fileTypeWarning: 'Only media files are allowed',
    filesUploaded: 'Files uploaded:',
    copied: 'Copied!',
    linkCopied: 'Link copied',
    deleted: 'Deleted',
    deleteError: 'Delete error',
    chatError: 'Chat send error',
    settingsUpdated: 'Settings updated',
    settingsUpdateError: 'Error updating settings',
    boardCleared: 'Board cleared',
    clearError: 'Error clearing board',
    confirmClear: 'Are you sure you want to completely clear the board?',
    
    // BottomInputBar
    writeNote: 'Write a note...',
    openCanvas: 'Draw',
    dictationStartText: 'Listening... (release to send)',
    pasteFromClipboard: 'Paste from clipboard',
    clipboardError: 'Clipboard access error',
    noSupportedDataInClipboard: 'No text or images in clipboard',
    micBlocked: 'Microphone access blocked',
    micDenied: 'Microphone access denied',
    sendText: 'Send text',
    voiceMessage: 'Voice message',

    // Chat
    chatTitle: 'Room Chat',
    chatPlaceholder: 'Write in chat...',
    usernamePrompt: 'Your chat name:',
    usernamePlaceholder: 'Press Enter',
    welcomeChat: 'Welcome to Chat',
    chatIntroText: 'Enter your name to start chatting with others.',
    startChatting: 'Start Chatting',
    yourNamePlaceholder: 'Your name...',
    nameSaved: 'Name saved',
    chatEmpty: 'Nothing here yet.',
    chatBeFirst: 'Be the first to leave a message!',
    youLabel: 'You',
    
    // Modals & Prompts
    settingsTitle: 'Room Settings',
    autoDeleteLabel: 'Auto-delete after:',
    never: 'Never',
    oneHour: '1 hour',
    oneDay: '24 hours',
    oneWeek: '7 days',
    passwordLabel: 'Password (leave empty to remove):',
    saveSettings: 'Save',
    close: 'Close',
    clearBoardAction: 'Clear entire board (Delete all)',
    showQR: 'Show QR code',
    copyLink: 'Copy link',
    
    passwordTitle: 'Room Entry',
    passwordEnterLabel: 'Enter password to access:',
    enterRoom: 'Enter',
    wrongPassword: 'Wrong password',

    // Canvas
    selectColor: 'Select color',
    brush: 'Brush',
    eraser: 'Eraser',
    clearCanvas: 'Clear',
    lineWidth: 'Size',
    saveDrawing: 'Save',

    // Cards
    boardEmpty: 'Board is empty',
    orDragDrop: 'or drag & drop',
    copyAction: 'Copy',
    shareAction: 'Share',
    deleteAction: 'Delete',
    downloadAction: 'Download',
    
    // QR
    qrTitle: 'Room QR Code',
    qrScanText: 'Scan with your phone camera',
    
    // Drag
    dropToUpload: 'Drop to upload',
    
    // Misc
    downloaded: 'File downloaded',
    zipPreparing: 'Preparing ZIP archive...',
    unsupportedFormat: 'Format not supported',
    dropFilesHere: 'Drop files here',
    nothingFound: 'Nothing here yet. Create a note or drop files.',
    // Auth
    login: 'Sign In',
    logout: 'Log Out',
    loginDesc: 'Sign in to permanently save your rooms and sync them across all devices.',
    privateRoomDesc: 'This is a private room. Sign in with the owner\'s account to access it.',
    // Files
    attachFile: 'Attach file',
    fileAdded: 'File added',
    // Password attempts
    tooManyAttempts: 'Too many attempts. Please wait',
    tryAgainIn: 'Try again in',
    // Read-only mode
    readOnlyBadge: 'Read-only',
    readOnlyHint: 'The owner has enabled read-only mode. You can view but not modify this board.',
    readOnlyToggle: 'Read-only mode',
    readOnlyToggleDesc: 'Guests can view the board but cannot add or delete items.',
    readOnlyError: 'Board is in read-only mode',
  }
};
