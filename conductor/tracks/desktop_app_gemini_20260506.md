# Трек: Desktop App (Tauri) — Gemini CLI Pro

**Статус:** 🟡 В разработке — Gemini CLI Pro  
**Дата старта:** 2026-05-06  
**Исполнитель:** Gemini CLI Pro (промпт ниже)  
**Ревью:** Claude Code (периодически по запросу пользователя)

---

## Промпт для Gemini CLI Pro

```
Тебе нужно создать десктопное приложение для ClayTablet —
сервиса мгновенного обмена текстом, изображениями и аудио
между устройствами через «комнаты» с коротким URL.

### Стек
Tauri v2 (Rust backend) + React 19 + TypeScript + Vite + Tailwind CSS v4.
Tauri плагины: tauri-plugin-clipboard, tauri-plugin-notification,
tauri-plugin-global-shortcut, tauri-plugin-tray, tauri-plugin-shell,
tauri-plugin-fs, tauri-plugin-store (для настроек).
WebSocket — нативный browser WebSocket внутри WebView.

Целевые платформы: Windows 10+, Linux (GTK).

### Бэкенд API (уже готов, менять не нужно)
Base URL по умолчанию: https://claytablet.online

REST endpoints:
  GET    /api/claytablet/{room_id}              — содержимое комнаты
  POST   /api/claytablet/{room_id}/text         — { "content": "текст" }
  POST   /api/claytablet/{room_id}/image        — multipart/form-data, поле "file"
  POST   /api/claytablet/{room_id}/audio        — multipart/form-data, поле "file"
  DELETE /api/claytablet/{room_id}/{item_id}    — удалить запись
  DELETE /api/claytablet/{room_id}/all          — очистить комнату
  GET    /api/claytablet/{room_id}/settings     — { ttl, is_protected, is_readonly, is_owner }
  POST   /api/claytablet/{room_id}/verify-password — { "password": "..." }
  GET    /api/auth/me                           — инфо о пользователе (Bearer токен)

WebSocket:
  wss://claytablet.online/api/ws/rooms/{room_id}
  Сервер шлёт строку "sync" при любом изменении в комнате.
  Клиент должен отвечать на "ping" → "pong".

Авторизация:
  - Опциональная. Заголовок: Authorization: Bearer <jwt>
  - Защищённая комната: заголовок X-Room-Password: <password>
  - JWT хранить через tauri-plugin-store под ключом "token"

Типы записей в комнате (поле type):
  text, image, audio, file
Поля: id, type, content (текст), url (медиа), filename, created_at

room_id: строка [a-zA-Z0-9_-]{2,32}

### Что нужно реализовать

#### 1. Главное окно (Board)
- Отображение комнаты: masonry-сетка карточек (как на вебе)
- TextCard: текст, кнопки Копировать / Удалить / Поделиться
- ImageCard: превью картинки, кнопки Копировать в буфер / Скачать / Удалить
- AudioCard: кнопка Play/Pause (HTMLAudioElement), кнопки Скачать / Удалить
- BottomBar: поле ввода текста (Enter = отправить),
  кнопка Вставить из буфера (читать системный clipboard через Tauri API),
  кнопка прикрепить файл (tauri dialog → upload)
- WebSocket: автоподключение, реконнект с exponential backoff,
  обновление board при получении "sync"
- Индикатор статуса WS (●online / ●offline)
- Переключатель комнат (история последних 8, хранить в store)

#### 2. System Tray
- Иконка в трее всегда (даже когда главное окно закрыто)
- Меню трея:
    Открыть ClayTablet
    ─────────────────
    Текущая комната: {room_id}
    Скопировать ссылку на комнату
    ─────────────────
    Выход
- При получении новой записи (WS sync) — показать нативное уведомление
  ОС с превью текста (первые 80 символов)
- Клик по уведомлению → открыть/поднять главное окно

#### 3. Глобальные горячие клавиши
  Ctrl+Shift+V — открыть Quick Paste окно (см. ниже)
  Ctrl+Shift+C — отправить текущий системный буфер обмена в комнату
                 (если там текст — /text, если изображение — /image)

Горячие клавиши работают глобально (даже когда приложение свёрнуто).
Использовать tauri-plugin-global-shortcut.

#### 4. Quick Paste окно (Ctrl+Shift+V)
- Небольшое всплывающее окно поверх всех окон (always-on-top),
  размер ~400×300px, появляется у курсора мыши
- Показывает последние 5 текстовых записей из комнаты
- Клик по записи → скопировать в системный буфер + закрыть окно
- ESC или клик вне окна → закрыть
- Отдельное окно Tauri с `alwaysOnTop: true`, `skipTaskbar: true`

#### 5. Настройки (отдельная страница)
- Сервер (по умолчанию https://claytablet.online)
- Текущая комната
- Тема (светлая / тёмная / системная)
- Язык (RU / EN)
- Запускать при старте системы (tauri-plugin-autostart)
- Горячие клавиши (показать, кнопка Reset to defaults)

### Структура проекта
src-tauri/
  src/
    main.rs          — точка входа Tauri, регистрация горячих клавиш,
                       tray, обработчики событий
    commands.rs      — Tauri commands для Rust-side операций
  tauri.conf.json
  Cargo.toml

src/                 — React frontend
  components/
    TextCard.tsx
    ImageCard.tsx
    AudioCard.tsx
    BottomBar.tsx
    ConnectionStatus.tsx
    QuickPasteWindow.tsx
  hooks/
    useWebSocket.ts  — WS + реконнект
    useRoom.ts       — загрузка/обновление данных
  pages/
    Board.tsx        — главный экран
    Settings.tsx     — настройки
  services/
    api.ts           — fetch-клиент
    store.ts         — обёртка над tauri-plugin-store
  i18n.ts            — RU/EN переводы
  main.tsx

### Поведение при закрытии окна
Крестик закрывает окно, но НЕ завершает приложение —
оно уходит в трей. Выход только через меню трея "Выход"
или через Settings → Выйти из приложения.

### Стиль
Повторяет веб-версию ClayTablet:
- Светлая тема: белый фон, slate-200 бордеры, indigo акцент (#6366f1)
- Тёмная тема: slate-900 фон, slate-700 бордеры
- Tailwind CSS v4, скруглённые карточки (radius 20px), лёгкие тени
- Шрифт: системный (Segoe UI / Ubuntu)

### Что НЕ нужно делать сейчас
- Canvas / рисование
- OAuth авторизация (оставь кнопку с TODO)
- Авто-синхронизация буфера обмена (clipboard listener) — оставь TODO
- Drag & Drop drop zone виджет — оставь TODO

### Результат
Проект должен собираться командами:
  npm install
  npm run tauri dev    — для разработки
  npm run tauri build  — production сборка (.exe для Windows, .AppImage для Linux)

Приложение должно работать без установки сервера — подключается к
https://claytablet.online из коробки.
```

---

## Чеклист для ревью

### Tauri setup
- [ ] Tauri v2 (не v1), `tauri.conf.json` корректный
- [ ] Плагины подключены в `Cargo.toml` и инициализированы в `main.rs`
- [ ] Сборка `npm run tauri build` проходит без ошибок

### Системная интеграция
- [ ] Tray иконка появляется при запуске
- [ ] Меню трея работает (открыть, ссылка, выход)
- [ ] Крестик → скрыть в трей (не завершить процесс)
- [ ] Уведомление при новой записи через WS
- [ ] Глобальный Ctrl+Shift+V открывает Quick Paste
- [ ] Глобальный Ctrl+Shift+C отправляет буфер в комнату

### Quick Paste окно
- [ ] Открывается поверх всех окон (alwaysOnTop)
- [ ] Показывает последние 5 записей
- [ ] Клик копирует и закрывает окно
- [ ] ESC / клик вне = закрыть

### API и WebSocket
- [ ] `services/api.ts` централизованный, правильные URL
- [ ] WS реконнект с backoff
- [ ] Ping/pong heartbeat
- [ ] Обновление при "sync"

### UI
- [ ] Все типы карточек (text, image, audio, file)
- [ ] BottomBar: текст, вставить из буфера, прикрепить файл
- [ ] Тёмная тема
- [ ] Все строки через i18n.ts
