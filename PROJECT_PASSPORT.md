# 📋 PASSPORT — DubTab Project

> **Версия:** 0.3.0
> **Дата обновления:** 2026-05-12
> **Статус:** 🟡 Ребрендинг задеплоен. HTTPS dubtab.pro ожидает сертификат. Папка на хосте ещё называется popycast.

---

## Версионирование

Схема: `0.MAJOR.PATCH`

| Позиция | Смысл | Пример |
|---|---|---|
| **Первая (`0`)** | Бета-статус. Станет `1` при выходе из беты | `0.x.x` → `1.x.x` |
| **Вторая (`MAJOR`)** | Крупный апдейт: новый функционал, движок, архитектура | `0.2.0` → `0.3.0` |
| **Третья (`PATCH`)** | Мелкие правки: UI-фиксы, опечатки, шрифты | `0.2.0` → `0.2.1` |

---

## Что это

**DubTab** — веб-платформа для мгновенного обмена текстом, изображениями, аудио и сообщениями между устройствами в реальном времени. Построена на концепции «комнат» — изолированных досок с уникальным коротким URL. Синхронизация через WebSocket.

**Целевое применение:** личный инструмент для быстрого обмена данными между компьютерами и телефонами, а также совместная работа с друзьями/коллегами по ссылке.

---

## Инфраструктура

| Компонент | Детали |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4 |
| **Backend** | Python 3.11, FastAPI, Uvicorn, WebSocket |
| **Desktop** | Tauri v2 (Rust + WebView), Windows / Linux / macOS |
| **Mobile** | React Native + Expo SDK 52 (в разработке) |
| **CLI** | Go-бинарник `dubtab` |
| **Proxy** | Caddy (автоматический HTTPS, Let's Encrypt) |
| **Container** | Docker + Docker Compose |
| **Storage** | SQLite (SQLAlchemy + Alembic) + файловая система (media volume) |
| **CI/CD** | GitHub Actions (backend + frontend + desktop matrix build) |

### Порты (Docker Production)

| Сервис | Внутренний | Внешний |
|---|---|---|
| Frontend (Caddy) | 80 (HTTP redirect) / 443 (HTTPS) | **443** |
| Backend (FastAPI) | 8000 | **8555** (прямой доступ, не рекомендуется) |

### Известные серверы

| Сервер | IP | SSH | Статус |
|---|---|---|---|
| Home Lab (Serverbook) | `192.168.1.2` | `illz@192.168.1.2` | ✅ Работает |
| VPS-2 (Aeza) | `109.120.134.188` | `admin@109.120.134.188 -p 2202 -i ~/.ssh/id_rsa_aeza` | ✅ Работает |

> ⚠️ SSH-ключ для VPS хранится на Serverbook: `~/.ssh/id_rsa_aeza`. Деплой выполняется через Serverbook.

### Текущие URLs

| Окружение | Frontend | Backend API |
|---|---|---|
| Production | `https://dubtab.pro` | `https://dubtab.pro/api` |
| Legacy redirect | `https://claytablet.online` → `dubtab.pro` | - |
| Backend direct | `http://109.120.134.188:8555/api/health` | ✅ Отвечает |
| Local Dev | `http://localhost:5173` | `http://localhost:8555` |

> HTTPS обеспечивается Caddy с автоматическим сертификатом от Let's Encrypt.

---

## Структура проекта

```
popycast/
├── backend/
│   ├── main.py              # FastAPI: все эндпоинты, WS, TTL-cleanup, logging
│   ├── database.py          # SQLAlchemy engine + session
│   ├── models.py            # ORM-модели (Room, Item, User)
│   ├── auth.py              # OAuth/JWT авторизация
│   ├── alembic/             # Миграции БД (3 выпущенных)
│   ├── tests/
│   │   ├── conftest.py      # Настройка DATA_DIR до импортов
│   │   └── test_api.py      # 20 pytest-тестов, 100% покрытие API
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # 13 компонентов
│   │   ├── hooks/           # useWebSocket, useToast, useAuth
│   │   ├── contexts/        # LanguageContext, ThemeContext
│   │   ├── stores/          # useBoardStore
│   │   ├── utils/           # exportUtils.ts
│   │   ├── pages/
│   │   │   ├── Board.tsx    # Главная доска
│   │   │   └── HomePage.tsx # Лендинг-страница
│   │   ├── api.ts           # Централизованный API-клиент
│   │   ├── types.ts         # TypeScript типы
│   │   ├── helpers.ts       # Утилиты (вкл. безопасный generateId)
│   │   ├── i18n.ts          # Словари переводов RU/EN
│   │   └── utils.tsx        # Утилиты (timeAgo, linkify, clipboard)
│   ├── Caddyfile            # dubtab.app + dubtab.ru redirect
│   ├── Dockerfile           # Multi-stage: node builder → caddy:alpine
│   └── .dockerignore
├── conductor/
│   ├── tracks/              # Трек-файлы
│   ├── tracks.md            # Реестр треков
│   ├── user_to_do.md        # Задачи пользователя
│   └── deploy_vps_prompt.md # Промпт для деплоя
├── data/
│   └── media/               # Примонтированный volume для медиафайлов
├── docker-compose.yml
└── PROJECT_PASSPORT.md
```

---

## API

| Метод | URL | Описание |
|---|---|---|
| `GET` | `/api/health` | Healthcheck |
| `GET` | `/api/dubtab/{room_id}` | Данные комнаты (тексты + картинки + аудио + чат + настройки) |
| `POST` | `/api/dubtab/{room_id}/text` | Добавить текст |
| `POST` | `/api/dubtab/{room_id}/image` | Загрузить картинку (multipart/form-data) |
| `POST` | `/api/dubtab/{room_id}/audio` | Загрузить аудио (multipart/form-data) |
| `POST` | `/api/dubtab/{room_id}/chat` | Сообщение в чат |
| `GET` | `/api/dubtab/{room_id}/settings` | Получить настройки комнаты |
| `POST` | `/api/dubtab/{room_id}/settings` | Обновить настройки (TTL, пароль) |
| `POST` | `/api/dubtab/{room_id}/order` | Обновить порядок карточек |
| `POST` | `/api/dubtab/{room_id}/verify-password` | Проверить пароль комнаты |
| `DELETE` | `/api/dubtab/{room_id}/all` | Очистить всю комнату |
| `DELETE` | `/api/dubtab/{room_id}/{item_id}` | Удалить элемент |
| `GET` | `/api/files/{filename}` | Получить медиафайл |
| `WS` | `/api/ws/rooms/{room_id}` | WebSocket канал комнаты |

**Лимиты:** `room_id` — `[a-zA-Z0-9_-]{2,32}`, текст — 100K символов, файл — 20 MB, текстов — 50/комнату, картинок — 30/комнату, аудио — 30/комнату, чат — 200 сообщений/комнату, WS — 50 подключений/комнату.

---

## Что реализовано ✅

### Функциональность
- [x] Изолированные комнаты по URL (`/{roomId}`)
- [x] Текст: вставка (Ctrl+V, поле ввода, Enter)
- [x] Изображения: Ctrl+V, Drag & Drop, мульти-файл
- [x] **Голосовые сообщения** (MediaRecorder, кросс-браузерный MIME)
- [x] **Canvas / Рисование** (CanvasModal с touch support)
- [x] **Пароль на комнату** (bcrypt, per-room, sessionStorage token)
- [x] Автолинкификация URL + YouTube embed + превью изображений
- [x] Real-time синхронизация через WebSocket
- [x] Авто-переподключение WS (exponential backoff + ping/pong heartbeat)
- [x] Индикатор статуса соединения
- [x] Чат комнаты с никнеймами
- [x] История 8 последних комнат
- [x] Копировать / Скачать / Поделиться / Удалить элементы
- [x] **Тёмная тема** (Dark Mode с Tailwind CSS и localStorage)
- [x] **Полная i18n** (RU/EN, все компоненты, localStorage)
- [x] **Форматы скачивания** (TXT, Markdown, ZIP с медиафайлами)
- [x] Masonry сетка (1-5 колонок, адаптив)
- [x] Toast-уведомления
- [x] Drag & Drop оверлей (текст, изображения, аудио)
- [x] QR-код для шаринга комнаты
- [x] TTL настройки (10мин / 1ч / 24ч / 7дней / навсегда)
- [x] Кастомный порядок карточек
- [x] Кнопка «Перейти в другую комнату» при неверном пароле

### Безопасность и надёжность
- [x] HTTPS (self-signed, запланирован Let's Encrypt)
- [x] bcrypt пароли на комнаты
- [x] Валидация MIME-типов (с учётом codec parameters)
- [x] Path traversal защита
- [x] Streaming upload (64KB чанки)
- [x] TTL-автоочистка
- [x] Лимит WS-подключений
- [x] Structured logging
- [x] Автоматические миграции БД (Alembic)
- [x] Rate Limiting (Brute-force защита)
- [x] Тестирование API (Pytest, 20 тестов)

---

## 🚨 TODO после пересоздания контейнера (2026-05-12)

1. **Проверить HTTPS**: `curl -s https://dubtab.pro/api/health` → должно вернуть `{"status":"ok"}`
   - Если нет: `ssh illz@serverbook "ssh -p 2202 -i ~/.ssh/id_rsa_aeza admin@109.120.134.188 'cd /opt/dubtab && sudo docker compose logs frontend --tail=50'"`
2. **GitHub**: Settings → Rename repo `claytablet` → `dubtab`
3. **OAuth**: добавить `https://dubtab.pro` в Google Console + Yandex callbacks
4. **UptimeRobot**: добавить монитор `https://dubtab.pro/api/health`
5. **Лого**: финальный PNG (𒁾 DUB на табличке) → `frontend/public/` + обновить manifest.json
6. **Demo GIF**: записать по `docs/marketing/demo_gif_howto.md` → `docs/demo.gif`
7. **Open Source запуск**: Reddit r/selfhosted + HN (тексты в `docs/marketing/`)
8. **Папка**: переименовать `popycast` → `dubtab` на хосте (см. трек rebranding_dubtab_20260512.md)
9. **VPS cleanup**: удалить `/opt/claytablet` после проверки `dubtab.pro`

---

## Деплой

```bash
# === Деплой: devcontainer → Serverbook → VPS ===

# Шаг 1: devcontainer → Serverbook
rsync -avz --exclude '.git' --exclude 'node_modules' --exclude 'frontend/dist' \
  --exclude 'data' --exclude '__pycache__' --exclude '.agents' \
  /home/vscode/popycast/ illz@serverbook:/srv/storage/Projects/dubtab/

# Шаг 2: Serverbook → VPS
ssh illz@serverbook "rsync -avz \
  --exclude '.git' --exclude 'node_modules' --exclude 'frontend/dist' \
  --exclude 'data' --exclude '__pycache__' \
  -e 'ssh -p 2202 -i ~/.ssh/id_rsa_aeza -o StrictHostKeyChecking=no' \
  /srv/storage/Projects/dubtab/ admin@109.120.134.188:/opt/dubtab/"

# Шаг 3: Пересобрать на VPS
ssh illz@serverbook "ssh -p 2202 -i ~/.ssh/id_rsa_aeza admin@109.120.134.188 \
  'cd /opt/dubtab && sudo docker compose up -d --build'"

# === Docker context (альтернатива из Serverbook) ===
# docker context use dubtab   # переключиться на VPS
# docker compose -f /opt/dubtab/docker-compose.yml ps

# === Диагностика ===
ssh illz@serverbook "ssh -p 2202 -i ~/.ssh/id_rsa_aeza admin@109.120.134.188 \
  'cd /opt/dubtab && sudo docker compose logs --tail=30'"

# Health check
curl http://109.120.134.188:8555/api/health
```

---

## Changelog

### v0.3.0 (2026-05-11) — Ребрендинг DubTab
- 🎨 **Ребрендинг ClayTablet → DubTab**: новое имя, домен `dubtab.pro`, логотип (знак 𒁾 DUB)
- 🔄 **API пути**: `/api/claytablet/` → `/api/dubtab/` во всех клиентах (frontend, desktop, CLI)
- 🔑 **Cookie/localStorage**: `claytablet_*` → `dubtab_*` (сессии сбросятся, нужен повторный логин)
- 🗄️ **DB**: `claytablet.db` → `dubtab.db`
- ⌨️ **CLI**: бинарь `claytab` → `dubtab`, Go module → `github.com/Goodspoken/dubtab/cli`
- 🌐 **Caddyfile**: `claytablet.online` теперь редиректит на `dubtab.pro`
- ✏️ **Canvas**: undo/redo (Ctrl+Z/Y, кнопки), текстовый инструмент, шаблоны (линия, прямоугольник, круг)

### v0.2.3 (2026-05-11) — в тестировании
- 🔒 **Plugin config endpoints под авторизацией**: `GET /api/plugins` и `GET/POST /api/plugins/{id}/config` теперь требуют JWT. Опциональный whitelist через `PLUGIN_ADMINS=<user_id>,<user_id>` в env. Лимит размера POST 64 KB.
- 🐛 **Хук `on_room_created` починен**: running loop сохраняется в `app.state.loop` при старте, sync-вызовы из threadpool используют `run_coroutine_threadsafe`. Раньше хук молча скипался при первом GET комнаты.
- 🔒 **Sentry DSN из env**: `VITE_SENTRY_DSN` вместо хардкода. Vite инлайнит на build. Без переменной фронтовый Sentry не инициализируется (для форков).
- 🧹 **SW cache cleanup**: записи шаров автоматически чистятся через 10 минут + ручной purge после успешной отправки.
- 🧹 **Рефакторинг auth-логики**: `_check_room_access` + `_extract_bearer_token` — устранено дублирование между HTTP и WebSocket путями.
- 🧹 **Сплит main.py 976 → 834**: вынесены `constants.py`, `schemas.py`, `system_rooms.py`, `lan_qr.py`.
- 🐛 **Утечка blob-URL в SharePage**: превью изображений теперь корректно вызывают `URL.revokeObjectURL` при размонтировании.
- 🐛 **Lint SharePage**: исправлен `set-state-in-effect` через async IIFE с cancel-флагом.
- 🐛 **Битая ссылка PLUGIN_API.md** в PluginsPanel: ведёт на GitHub.

### v0.2.2 (2026-05-11)
- ✅ **PWA Share Target**: DubTab появляется в системном меню «Поделиться» на Android/iOS. Service Worker перехватывает системный POST, файлы временно хранятся в Cache API. Страница `/share` — превью контента + список последних комнат одним тапом. Поддержка: фото, аудио, файлы, текст, ссылки.
- ✅ **Plugin Engine**: движок плагинов без изоляции (`plugin_manager.py` + `plugin_sdk.py`). Хуки событий, cron-расписание (APScheduler), HTTP-эндпоинты плагинов, CRUD конфига. CLI-команды `dubtab plugin list/config/call`. TUI-режим плагинов (`p`). Секция «Плагины» в веб-Settings.

### v0.2.1 (2026-05-07) — задеплоено
- ✅ **Реактивный язык**: `useI18n` переписан на `useSyncExternalStore` — переключение языка мгновенно работает во всех компонентах одновременно.
- ✅ **Реактивная тема**: новый `useTheme` hook с тем же паттерном — тёмная/светлая/системная тема синхронизируется глобально. Учитывает `prefers-color-scheme` в реальном времени.
- ✅ **Шестерёнка в Settings**: иконка `Settings` (gear) вместо `Settings2`.
- ✅ **Версия в апдейтах**: отображается через `getVersion()` из Tauri API вместо хардкода.
- ✅ **Публичные + системные комнаты**: флаги `is_public`/`is_system`, 6 системных досок (`_help`, `_about`, `_me`, `_log`, `_team`, `_terms`), раздел на главной странице.
- ✅ **Навигация в дропдауне**: поле "Перейти в комнату" добавлено в меню «Комната» веб-фронтенда.
- ✅ **Чат в публичных readonly**: `verify_chat_access` — гости могут писать в чат публичных комнат, даже если они read-only.
- ✅ **Удалён orphan BottomBar.tsx**.
- 🔵 **Десктоп v0.2.1**: требует нового GitHub тега для сборки CI.

### v0.2.0 (2026-05-07)
- ✅ **Десктоп-приложение (Tauri v2)**: нативный клиент под Windows / Linux / macOS (Apple Silicon). Системный трей, Quick Paste (`Ctrl+Shift+V`), отправка буфера (`Ctrl+Shift+C`), тёмная тема, RU/EN.
- ✅ **Auto-updater**: встроенная проверка и установка обновлений прямо из Settings, прогресс-бар загрузки, кнопка «Перезапустить».
- ✅ **GitHub CI/CD**: матричная сборка (Windows / Ubuntu / macOS) через `tauri-apps/tauri-action`, подпись релизов (minisign), автопубликация на GitHub Releases.
- ✅ **GitHub репозиторий**: проект открыт на https://github.com/Goodspoken/dubtab, CI (backend + frontend + desktop), CONTRIBUTING.md.
- ✅ **Фикс Offline**: capabilities.json теперь включает все разрешения плагинов — исправлен главный баг десктопа.

### v0.1.x → Старая внутренняя нумерация (2026-04-15 — 2026-05-06)
> Версии 1.x.x — 2.4.x были внутренними итерациями до введения публичной схемы версионирования.
> Детальный changelog сохранён ниже под оригинальными тегами.

### [legacy] v2.4.0 (2026-04-29)
- ✅ **Read-Only доски**: владелец включает режим через настройки, гостям скрыт input-бар и кнопки удаления. Бэкенд: `is_readonly` + `is_owner` в API, `verify_write_access` dependency.
- ✅ **install.sh**: `curl | bash` — авто-генерация JWT, определение LAN IP, опциональный QR-код.
- ✅ **README.md**: переписан — фичи, CLI шпаргалка, tech stack таблица.
- ✅ **CI**: GitHub Actions — 3 параллельных джоба: backend (ruff + pytest), frontend (eslint + build), cli (go build).
- ✅ **CLI**: новые команды `ls`, `copy/cp`, `show`, `rm`, `clear`, `new`, `me`, `logout`. Групповой help.
- ✅ **Миграция VPS**: деплой переехал с `/opt/clipboard/` на `/opt/dubtab/`. Docker context `dubtab` создан на Serverbook.

### v2.3.0 (2026-04-26)
- ✅ **Фикс тестов**: 20/20 pytest тестов проходят. Добавлен `conftest.py` + `engine.dispose()` для правильной изоляции SQLite в тестах.
- ✅ **Безопасная генерация Room ID**: `HomePage.tsx` использовал `Math.random()` — заменён на `crypto.randomUUID()` из `helpers.ts`.
- ✅ **Первый деплой на VPS**: Docker-образы собраны, контейнеры запущены на `109.120.134.188`. Backend health: OK.
- ✅ **Документация**: Обновлен `deploy_vps_prompt.md` (правильный SSH-ключ, домен). Создан `user_to_do.md`. Обновлены треки и паспорт.
- ⏳ **Ожидание**: DNS `dubtab.app` и `dubtab.ru` должны быть направлены на `109.120.134.188` — тогда Caddy автоматически получит SSL.

### v2.2.0 (2026-04-22)
- ✅ **Стабильность & Безопасность**: Устранен баг с 413 ошибкой (Payload Too Large), исправлена утечка WS-соединений к базе данных, внедрен Rate Limiter против brute-force атак на пароли, CORS-домены строго ограничены.
- ✅ **Архитектура**: Добавлен Alembic для автоматических миграций схемы БД. Блокирующие синхронные эндпоинты в FastAPI переведены в пулы потоков для предотвращения задержек event loop.
- ✅ **Рефакторинг**: Настроена инфраструктура тестов (20 pytest тестов), избавление от хардкода строк в компонентах (полное использование `i18n t()`), экстракт дублирующегося кода загрузки в единый хелпер `_upload_media`, разделение `utils.tsx` на чистую логику и JSX.
- ✅ **UX**: Добавлена специальная кнопка "Вставить" в `BottomInputBar` для надежной работы с буфером обмена на мобильных устройствах (использует `navigator.clipboard`).

### v2.1.0 (2026-04-20)
- ✅ Тёмная тема (Tailwind `dark:`, ThemeContext, localStorage)
- ✅ Полная интернационализация RU/EN (LanguageContext, i18n.ts, все компоненты)
- ✅ Форматы скачивания: TXT, Markdown, ZIP с медиафайлами
- ✅ Переезд с Nginx на Caddy (автоматический HTTPS через DuckDNS)
- ✅ Мобильный backdrop для чата
- ✅ Мобильный переключатель языка в Room-dropdown
- ✅ Улучшенный empty state на доске
- ✅ Toast-уведомления адаптированы под тёмную тему
- ✅ `timeAgo()` и экспорт локализованы по выбранному языку

### v2.0.1 (2026-04-19)
- ✅ HTTPS с self-signed SSL (Dockerfile + nginx)
- ✅ Фикс MIME-валидации аудио (`audio/webm;codecs=opus` теперь принимается)
- ✅ Читаемый `.txt` формат при скачивании архива
- ✅ Кнопка «Перейти в другую комнату» в PasswordPrompt
- ✅ Иконка SendHorizontal в чате
- ✅ Удалён дублированный `uvicorn.run()` в backend

### v2.0.0 (2026-04-19)
- ✅ Голосовые сообщения (MediaRecorder, Safari/iOS поддержка)
- ✅ Canvas / Рисование
- ✅ Пароль на комнату (bcrypt)
- ✅ Редизайн Header + BottomInputBar
- ✅ WebSocket Heartbeat (ping/pong каждые 30с)
- ✅ Debounce на WS sync (300мс)
- ✅ CORS fix (`allow_origin_regex`)

### v1.3.0 (2026-04-15)
- ✅ Декомпозиция Board.tsx → 13 компонентов
- ✅ Централизованный API-клиент (`api.ts`)
- ✅ QR-код, TTL настройки, Structured logging
- ✅ Все критические баги исправлены
