# Трек: Аудит и hardening (Opus review)

**Статус:** ✅ Завершён  
**Приоритет:** 🔴 Высокий  
**Дата создания:** 2026-05-11  
**Задеплоено:** 2026-05-11 на dubtab.app

---

## Цель

Полный код-аудит проекта силами Claude Opus после серии быстрых фич (Plugin Engine + PWA Share Target). Найти security/correctness баги, мёртвые ссылки, утечки, оценить структуру кода. Починить всё критичное.

---

## Найдено и исправлено

### 🔴 Критичное

**#1. Plugin config endpoints без авторизации**  
`GET /api/plugins` и `GET/POST /api/plugins/{id}/config` были открыты в интернет — любой мог читать/писать `config.json` плагинов (где могли лежать API-ключи, room_id для автопоста и т.п.).

- Добавлен `_require_admin()` хелпер: проверяет JWT, опционально — whitelist `PLUGIN_ADMINS=<id1>,<id2>` из env.
- Лимит размера тела POST: 64 KB.
- Фронтенд (`PluginsPanel`) теперь показывает «Управление доступно только администратору» при 401/403.

[backend/plugin_manager.py](backend/plugin_manager.py), [frontend/src/components/PluginsPanel.tsx](frontend/src/components/PluginsPanel.tsx)

**#2. Хук `on_room_created` не срабатывал на самом частом пути**  
`touch_room()` синхронная, вызывалась из синхронного `get_clipboard` (FastAPI запускает sync def в threadpool). В worker-треде `asyncio.get_event_loop()` возвращал не тот лупер, хук молча скипался.

- Добавлен `_schedule_hook()` хелпер: использует `asyncio.run_coroutine_threadsafe` против сохранённого в `app.state.loop` running loop.
- Running loop сохраняется в `lifespan()` через `asyncio.get_running_loop()`.

[backend/main.py:108-145](backend/main.py#L108-L145)

**#3. Sentry DSN захардкожен в коде**  
DSN был прямо в `main.tsx` — попадал в JS-бандл и в git-историю. Для self-hosted форков это означало, что их ошибки летели бы на мой Sentry-аккаунт.

- DSN читается из `VITE_SENTRY_DSN` (Vite inline во время build).
- `Sentry.init` теперь условный — если переменная пуста, фронтенд не отправляет ничего.
- `Dockerfile` принимает `ARG VITE_SENTRY_DSN`, `docker-compose.yml` пробрасывает из `.env`.

[frontend/src/main.tsx](frontend/src/main.tsx), [frontend/Dockerfile](frontend/Dockerfile), [docker-compose.yml](docker-compose.yml), [.env.example](.env.example)

### 🟡 Важное

**#4. Lint-ошибка в SharePage** (починена по ходу аудита)  
`useEffect → useCallback → setState` ловится react-hooks v7 как `set-state-in-effect`. Заодно починена утечка blob-URL в превью (не вызывался `URL.revokeObjectURL`).

**#5. Битая ссылка на PLUGIN_API.md**  
`/api/plugins/PLUGIN_API.md` отдавал 404 — бэкенд не сервит этот файл. Ссылка переведена на GitHub.

**#6. Service Worker cache рос бесконечно**  
`dubtab-share-v1` копил данные шаров без чистки. Добавлен TTL 10 минут (purge перед каждым новым шаром по timestamp-prefix ключа) + ручной `postMessage({type: 'purge-share'})` от `SharePage` после успешной отправки.

[frontend/public/sw.js](frontend/public/sw.js)

**#7. Дублирование auth-логики**  
`verify_room_access` (HTTP) и `verify_room_access_sync` (WS) содержали почти идентичный код — правка одного забывалась в другом.

- Вынесен общий `_check_room_access(room, token, password)` — единая точка проверки.
- Вынесен `_extract_bearer_token(request)` — корректный парсинг `Authorization: Bearer ...` (используется `split(" ", 1)` вместо хрупкого `split(" ")[1]`).

**#8. Сплит main.py**  
976 строк уменьшено до 834. Вынесены leaf-модули без риска циркулярных импортов:

- `constants.py` — все лимиты, MIME/extension whitelists, TTL_PRESETS
- `schemas.py` — Pydantic-модели (`TextItem`, `ChatItem`, `RoomSettings`, `OrderSettings`, `PasswordVerification`)
- `system_rooms.py` — `SYSTEM_ROOMS` + `seed_system_rooms()`
- `lan_qr.py` — `get_local_ip()` + `print_lan_qr()`

Route-сплит (`routes_rooms.py`, `routes_items.py`, `routes_ws.py`) отложен — есть циркулярные зависимости с `plugin_manager` и `rooms`-dict, требует более крупного рефакторинга. Заведено как follow-up.

---

## Проверки

- ✅ `pytest` — 27/27 проходят
- ✅ `ruff check backend/` — clean
- ✅ `npm run lint` — clean
- ✅ `npm run build` — clean
- ✅ Health check на VPS — `{"status":"ok"}`

---

## Follow-up (не сделано в этом треке)

- **Route-split main.py** — `routes_rooms.py`, `routes_items.py`, `routes_ws.py`. Требует выделения `state.py` с shared singletons.
- **Тесты для Plugin Engine** — нет покрытия `plugin_manager.load_plugins()`, decorator-registration, fire().
- **Тесты для Share Target** — нет покрытия `/share` POST, SW cache.
- **JWT secret hard-fail** — при `ENVIRONMENT=production` и дефолтном `JWT_SECRET` крашить startup.
- **Bundle code-splitting** — `SharePage`, `PrivacyPage`, `TermsPage` в `React.lazy`. Сейчас 779 KB одним чанком.
- **`asyncio.get_event_loop()` deprecation warnings** в тестах (отключены).
