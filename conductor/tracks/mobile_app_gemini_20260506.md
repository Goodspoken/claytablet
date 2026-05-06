# Трек: Мобильное приложение (React Native / Expo)

**Статус:** 🟡 В разработке — Gemini CLI Pro  
**Дата старта:** 2026-05-06  
**Исполнитель:** Gemini CLI Pro (промпт ниже)  
**Ревью:** Claude Code (периодически по запросу пользователя)

---

## Что делаем

Мобильное приложение на React Native + Expo для ClayTablet.  
Managed workflow — без `expo prebuild`, запускается через `npx expo start`.

---

## Промпт для Gemini CLI Pro

```
Тебе нужно создать мобильное приложение для ClayTablet — 
сервиса мгновенного обмена текстом, изображениями и аудио 
между устройствами через «комнаты» с коротким URL.

### Стек
React Native + Expo (SDK 52+). TypeScript. Expo Router (file-based routing).
Для WebSocket — встроенный `WebSocket` API.
Для буфера — `expo-clipboard`.
Для камеры/медиа — `expo-image-picker`, `expo-av`.
Для уведомлений — `expo-notifications`.
Для хранения настроек — `expo-secure-store`.

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
  - JWT хранить в expo-secure-store под ключом "claytablet_token"

Типы записей в комнате (поле type):
  text, image, audio, file
Поля: id, type, content (текст), url (медиа), filename, created_at

room_id: строка [a-zA-Z0-9_-]{2,32}

### Что нужно реализовать

ЭКРАНЫ:
1. HomeScreen — история последних 8 комнат (expo-secure-store),
   кнопка "Создать новую" (crypto.randomUUID()), поле "Перейти по ID",
   кнопка "Сканировать QR" (expo-barcode-scanner).

2. BoardScreen (/:roomId) — главный экран:
   - Список записей (FlatList), поддержка pull-to-refresh
   - Карточки: TextCard (текст + кнопка копировать), ImageCard (превью),
     AudioCard (кнопка воспроизвести), FileCard
   - Каждая карточка: кнопки Копировать / Поделиться / Удалить (свайп влево)
   - BottomBar: поле ввода текста, кнопка отправить, кнопка прикрепить
     (фото из галереи / камера / файл), кнопка голосового сообщения
     (запись через expo-av, отправить как audio)
   - WebSocket: автоподключение, реконнект с exponential backoff,
     обновление списка при получении "sync"
   - Индикатор статуса соединения (●online / ●offline)

3. SettingsScreen — сервер (по умолчанию claytablet.online, можно
   поменять для self-hosted), комната, тема (светлая/тёмная),
   язык (RU/EN).

4. AuthScreen — кнопка "Войти через Google" и "Войти через Yandex"
   (открыть WebBrowser, поймать redirect с токеном через expo-linking).

ПОВЕДЕНИЕ:
- Share Extension: в системном меню "Поделиться" приложение должно
  появляться как цель — тогда текст/фото из любого приложения можно
  отправить в текущую комнату одним тапом.
- Буфер обмена: при открытии BoardScreen проверять буфер, если там
  текст/изображение — предлагать вставить (один таст).
- Оффлайн: показывать последние загруженные данные из AsyncStorage.
- Тёмная тема: следовать системной настройке, ручной переключатель.
- Хранить историю комнат (последние 8) и текущий сервер в SecureStore.

СТИЛЬ:
- Минималистичный, белый/тёмно-серый.
- Акцентный цвет: indigo (#6366f1).
- Шрифт: системный (San Francisco / Roboto).
- Карточки с скруглёнными углами (radius 16), лёгкая тень.
- Анимации: react-native-reanimated для свайпов и появления карточек.

### Что НЕ нужно делать сейчас
- Push-уведомления (оставь заглушку)
- Canvas / рисование
- Drag & Drop сортировка
- OAuth (оставь кнопку неактивной с TODO)

### Структура проекта
app/
  (tabs)/
    index.tsx         — HomeScreen
    settings.tsx      — SettingsScreen
  [roomId]/
    index.tsx         — BoardScreen
  auth.tsx            — AuthScreen
components/
  TextCard.tsx
  ImageCard.tsx
  AudioCard.tsx
  BottomBar.tsx
  ConnectionStatus.tsx
hooks/
  useWebSocket.ts     — WS + реконнект
  useRoom.ts          — загрузка/обновление данных комнаты
  useClipboard.ts     — работа с буфером
services/
  api.ts              — все fetch-вызовы
  storage.ts          — обёртка над SecureStore / AsyncStorage
constants/
  colors.ts, i18n.ts

### Результат
Рабочее Expo-приложение, которое запускается командой `npx expo start`.
Без нативных модулей требующих `expo prebuild` — только managed workflow.
Все строки через i18n.ts (RU/EN).
```

---

## Чеклист для ревью (что проверять при каждой итерации)

### Архитектура
- [ ] Managed Expo workflow (нет `android/`, `ios/` папок)
- [ ] Expo Router с правильной структурой `app/`
- [ ] TypeScript везде, нет `any`
- [ ] Все строки через `i18n.ts`, нет хардкода

### API интеграция
- [ ] `services/api.ts` — централизованный клиент
- [ ] Правильные URL (`/api/claytablet/{room_id}/...`)
- [ ] Заголовки: `X-Room-Password`, `Authorization: Bearer`
- [ ] Обработка ошибок: 401, 403, 4xx, сеть недоступна

### WebSocket
- [ ] `hooks/useWebSocket.ts` с реконнектом
- [ ] Exponential backoff (не спам-реконнект)
- [ ] Ping/pong heartbeat (ответ на сервер-ping)
- [ ] Обновление данных при получении `"sync"`

### UI/UX
- [ ] HomeScreen: история 8 комнат, создать новую, ввод ID
- [ ] BoardScreen: FlatList, pull-to-refresh, карточки всех типов
- [ ] BottomBar: текст, прикрепить, голос
- [ ] Свайп влево = удалить (с подтверждением)
- [ ] Тёмная тема работает

### Критические баги (на что смотреть в первую очередь)
- [ ] WS не переподключается при потере сети
- [ ] Изображения загружаются как `multipart/form-data` (не base64)
- [ ] Audio записывается и отправляется корректно
- [ ] Нет утечки WS-соединений при смене комнат
