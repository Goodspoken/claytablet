# CLAUDE.md

Этот файл содержит подсказки для Claude Code (claude.ai/code) при работе с кодом в этом репозитории.

## Проект

DubTab (внутреннее имя: PopyCast/popycast) — обмен буфером обмена между устройствами в реальном времени. Изолированные «комнаты» по короткому URL, синхронизация через WebSocket. Поддержка текста, изображений, аудио (MediaRecorder), файлов, рисунков на канвасе и чата. Self-hosted через Docker.

`PROJECT_PASSPORT.md` (на русском) — живой статус-документ: IP серверов, текущее состояние деплоя, changelog. Читай его перед нетривиальной работой. `GEMINI.md` — более старый обзор, оставлен для справки.

## Команды

### Бэкенд (Python 3.11 / FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload                  # dev-сервер на :8000
pytest tests/ -v                           # все 20 API-тестов
pytest tests/test_api.py::TestHealthCheck::test_health -v   # один тест
ruff check backend/                        # линт (проверяется в CI)
```

### Фронтенд (React 19 / Vite)
```bash
cd frontend
npm install
npm run dev                                # dev-сервер на :5173, /api проксируется на :8000
npm run build                              # tsc -b && vite build (проверяется в CI)
npm run lint                               # eslint
```

### Docker (production-like)
```bash
docker compose up -d --build               # весь стек
docker compose up -d --build backend       # только бэкенд
docker compose logs --tail=30              # диагностика
```
Фронтенд на `:80/:443` (Caddy), бэкенд проброшен на `:8555` → контейнер `:8000`.

## Архитектура

### Трёхзвенный поток
1. **Caddy** ([frontend/Caddyfile](frontend/Caddyfile)) терминирует HTTPS для `dubtab.app` (Let's Encrypt автосертификат), отдаёт React SPA и проксирует `/api/*` на `backend:8000`. `dubtab.ru` редиректит на `.online`.
2. **FastAPI бэкенд** ([backend/main.py](backend/main.py)) предоставляет REST + WebSocket по `/api/dubtab/{room_id}/...`. SQLite через SQLAlchemy для персистентности; in-memory `dict[str, list[WebSocket]]` для живых соединений.
3. **React SPA** маршрутизирует `/:roomId` на страницу `Board`; `HomePage` генерирует ID новых комнат через `crypto.randomUUID()`.

### Особенности бэкенда
- **БД** ([backend/database.py](backend/database.py), [backend/models.py](backend/models.py)): SQLite по пути `${DATA_DIR}/dubtab.db` (DATA_DIR по умолчанию `/app/data`, в тестах переопределяется через `conftest.py`). Три таблицы: `User`, `Room` (с опциональными `owner_id`, `password_hash`, `ttl`, `layout_order`), `Item` (полиморфная по `item_type`: text/image/audio/file/chat).
- **Миграции** ([backend/alembic/](backend/alembic/)): на старте `_init_database()` сначала делает `create_all()`, потом `alembic upgrade head`. Новые миграции — в `alembic/versions/`.
- **Авторизация** ([backend/auth.py](backend/auth.py)): опциональный OAuth Google/Yandex через `fastapi-sso`. Выдаёт JWT (HS256, срок 30 дней) в куку `dubtab_token` либо через `Authorization: Bearer`. Комнаты с `owner_id` — личные, доступны только владельцу.
- **Доступ к комнате** контролируется зависимостью `verify_room_access`: сначала проверка владельца → потом bcrypt-проверка пароля (заголовок `X-Room-Password` или query `?password=`). Rate-limit: 10 попыток/мин/IP через in-memory словарь.
- **WebSocket** на `/api/ws/rooms/{room_id}`: клиенты шлют произвольный текст, который рассылается остальным пирам в комнате (сам сервер только инжектит `"sync"` после записей через `broadcast_sync`). Heartbeat `ping`/`pong`; максимум 50 соединений на комнату. Авторизация использует короткоживущую DB-сессию — **не держи** `Depends(get_db)` на всё время жизни WS.
- **TTL-очистка** запускается каждые 5 мин в фоновой задаче; `ttl="forever"` (дефолт для личных комнат) исключён. У устаревших комнат сначала удаляются медиафайлы с диска, затем строка из БД (cascade чистит `Item`).
- **Загрузки** идут стримом по 64KB. Лимиты: 50MB/файл, 100K символов/текст, на комнату — 50 текстов / 30 картинок / 30 аудио / 200 чат-сообщений. MIME-валидация срезает codec-параметры (например, `audio/webm;codecs=opus` → `audio/webm`).
- **Sentry** инициализируется только если задана переменная `SENTRY_DSN`.

### Особенности фронтенда
- **Состояние** ([frontend/src/stores/useBoardStore.ts](frontend/src/stores/useBoardStore.ts)): zustand-стор как единственный источник правды для содержимого доски.
- **API-клиент** ([frontend/src/api.ts](frontend/src/api.ts)): централизованные axios-вызовы; `getAuthHeaders` читает per-room токен пароля из `sessionStorage[room_token_${roomId}]`. Глобальный response-interceptor диспатчит window-событие `auth:required` на 401.
- **WebSocket** ([frontend/src/hooks/useWebSocket.ts](frontend/src/hooks/useWebSocket.ts)): переподключение с экспоненциальным backoff + ping/pong heartbeat + debounce 300мс на входящие `sync`-события.
- **i18n** ([frontend/src/i18n.ts](frontend/src/i18n.ts), [frontend/src/contexts/LanguageContext.tsx](frontend/src/contexts/LanguageContext.tsx)): словари RU/EN, сохраняются в localStorage. **Не хардкоди UI-строки** — всегда используй `t()` из LanguageContext.
- **Тема** ([frontend/src/contexts/ThemeContext.tsx](frontend/src/contexts/ThemeContext.tsx)): тёмный режим Tailwind v4 через `dark:`-классы, сохраняется в localStorage.
- **Vite-прокси** ([frontend/vite.config.ts](frontend/vite.config.ts)) форвардит `/api` (вместе с WS-апгрейдами) на `http://127.0.0.1:8000` для дева — бэкенд запускай отдельно.

## Версионирование

Схема: `0.MAJOR.PATCH`
- **Первая цифра `0`** — бета-статус. Станет `1` при выходе из беты.
- **MAJOR** — новый функционал, движок, архитектурные изменения (0.2.0 → 0.3.0).
- **PATCH** — мелкие фиксы: UI, шрифты, опечатки (0.2.0 → 0.2.1).

При создании нового тега всегда обновляй версию в `desktop/src-tauri/tauri.conf.json` и `desktop/package.json`.

## Соглашения

- Относительные даты («четверг») переводи в абсолютные (`2026-04-30`) в любых документах, которые пишешь — `PROJECT_PASSPORT.md` следует этому правилу.
- Используй безопасный `generateId` из [frontend/src/helpers.ts](frontend/src/helpers.ts) (обёртка вокруг `crypto.randomUUID()`); никогда `Math.random()` для ID.
- Бэкенд весь async/await; блокирующую работу внутри эндпоинтов нужно выносить в thread pool (это был фикс v2.2.0).
- `room_id` обязан матчиться по `^[a-zA-Z0-9_-]{2,32}$` (обеспечивается на сервере через `Path(..., pattern=ROOM_ID_REGEX)`).
- Внутренняя директория — `popycast/` и многие старые доки/комменты называют проект так. Пользователь видит **DubTab** — префикс API-путей: `/api/dubtab/...`.

## Деплой

Production-цель: VPS `109.120.134.188:2202`, пользователь `admin`, проект в `/opt/clipboard`. SSH-ключ `~/.ssh/id_rsa_aeza` лежит на домашнем Serverbook (`illz@192.168.1.2`); деплой идёт devcontainer → Serverbook → VPS через цепочку `rsync`, документированную в `PROJECT_PASSPORT.md` § Деплой. С Windows используется хелпер [deploy.ps1](deploy.ps1); см. также [scripts/deploy.sh](scripts/deploy.sh) и [scripts/deploy_to_vps.sh](scripts/deploy_to_vps.sh).

## Переменные окружения

Обязательные: `JWT_SECRET`, `HOST_URL`, `ALLOWED_ORIGINS` (через запятую). Опциональные: `GOOGLE_CLIENT_ID/SECRET`, `YANDEX_CLIENT_ID/SECRET`, `SENTRY_DSN`, `ENVIRONMENT`, `DATA_DIR`. См. [.env.example](.env.example).
