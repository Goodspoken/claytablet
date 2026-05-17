# Трек: Plugin Engine — Ядро системы плагинов

**Статус:** 🔵 Планирование  
**Приоритет:** 🔴 Высокий  
**Дата создания:** 2026-05-08  
**Блокирует:** Трек RSS Plugin

---

## Цель

Реализовать движок плагинов без изоляции для self-hosted пользователей. Плагин — это папка с `manifest.json` + `plugin.py`. Установка: скинул папку в `plugins/` → рестарт сервера. Никакой магии.

Целевая аудитория: технически грамотные пользователи (разработчики, сисадмины), которые сами деплоят DubTab и хотят расширять его под свои задачи без форка.

---

## Архитектура

### Структура плагина

```
plugins/
  rss-fetcher/
    manifest.json        # метаданные и права
    plugin.py            # бэкенд-хуки
    config.json          # настройки инстанса (создаётся пользователем)
    requirements.txt     # опционально — свои зависимости
    frontend/
      index.js           # опционально — React-компоненты (v2)
```

### manifest.json

```json
{
  "id": "rss-fetcher",
  "name": "RSS Auto-Post",
  "version": "1.0.0",
  "author": "username",
  "description": "Автоматически публикует записи из RSS-лент в комнаты",
  "hooks": ["on_startup", "scheduled", "http_get"],
  "min_claytablet_version": "0.2.1"
}
```

### Что импортирует plugin.py

```python
from claytablet_sdk import hook, scheduled, api, http

@hook("on_startup")
async def init():
    print("[rss-fetcher] loaded")

@scheduled(cron="0 * * * *")
async def fetch():
    for feed in load_config()["feeds"]:
        await api.add_text(feed["room_id"], f"📰 {feed['title']}\n{feed['url']}")

@http.get("/feeds")                  # → GET /api/plugins/rss-fetcher/feeds
async def get_feeds(request):
    return load_config()["feeds"]
```

---

## Новые файлы

### `backend/plugin_manager.py`

Основной движок:

- `PluginManager` — синглтон
- `load_plugins(plugins_dir)` — сканирует папки, читает manifest, импортирует `plugin.py` через `importlib`
- `register_hook(name, fn)` — реестр: `dict[str, list[Callable]]`
- `register_scheduled(cron, fn)` — регистрирует в APScheduler
- `register_route(method, path, fn)` — кастомный HTTP-маршрут
- `async fire(hook_name, **kwargs)` — вызывает все обработчики хука, ловит ошибки индивидуально (один упавший плагин не роняет остальные)
- `get_fastapi_router()` — возвращает `APIRouter` с маршрутами всех плагинов, монтируется на `/api/plugins/{plugin_id}`
- `list_plugins()` — список манифестов для `/api/plugins`

### `backend/plugin_sdk.py`

То, что импортируют плагины. Добавляется в `sys.path` при загрузке:

```python
# Объекты-декораторы
hook        # @hook("on_text_added")
scheduled   # @scheduled(cron="*/5 * * * *")
http        # @http.get("/path"), @http.post("/path")

# API-объект — обёртки над внутренними функциями
api.add_text(room_id, content)          → str (item_id)
api.add_image(room_id, file)            → str (item_id)
api.get_items(room_id)                  → list[dict]
api.delete_item(room_id, item_id)       → None
api.get_room_settings(room_id)          → dict
```

Всё асинхронное. `api` использует `httpx.AsyncClient` к localhost, либо напрямую вызывает внутренние функции (предпочтительно, без HTTP-оверхеда).

---

## Хуки v1

| Хук | Аргументы | Когда |
|---|---|---|
| `on_startup` | — | Сервер стартовал, все плагины загружены |
| `on_shutdown` | — | Сервер останавливается |
| `on_text_added` | `room_id, content, item_id` | Добавлен текст |
| `on_image_added` | `room_id, filename, item_id` | Добавлено изображение |
| `on_item_deleted` | `room_id, item_id` | Удалён элемент |
| `on_room_created` | `room_id` | Создана комната |
| `scheduled` | `cron="…"` | По расписанию (APScheduler CronTrigger) |
| `http.get/post/delete` | `path="…"` | Кастомный HTTP-эндпоинт плагина |

---

## Изменения в `backend/main.py`

1. Создать глобальный `plugin_manager = PluginManager()`
2. В `lifespan` startup — вызвать `plugin_manager.load_plugins(Path("plugins"))` 
3. Подключить `plugin_manager.get_fastapi_router()` к `app`
4. После `add_text` — вызвать `await plugin_manager.fire("on_text_added", ...)`
5. После `add_image` — `await plugin_manager.fire("on_image_added", ...)`
6. После `delete_item` — `await plugin_manager.fire("on_item_deleted", ...)`
7. После `touch_room` (первое создание) — `await plugin_manager.fire("on_room_created", ...)`
8. В `lifespan` shutdown — `await plugin_manager.fire("on_shutdown")`

## Новые API-эндпоинты

| Метод | URL | Описание |
|---|---|---|
| `GET` | `/api/plugins` | Список установленных плагинов (id, name, version, status) |
| `GET` | `/api/plugins/{id}/config` | Получить config.json плагина |
| `POST` | `/api/plugins/{id}/config` | Сохранить config.json плагина |
| `*` | `/api/plugins/{id}/{path}` | Роуты зарегистрированные плагином |

---

## Зависимости

Добавить в `backend/requirements.txt`:
- `apscheduler>=3.10` — для `@scheduled`

---

## Порядок реализации

1. `plugin_sdk.py` — интерфейс (декораторы + api-объект)
2. `plugin_manager.py` — движок
3. Интеграция в `main.py` — fire-хуки + роутер
4. `GET /api/plugins` эндпоинт
5. `GET/POST /api/plugins/{id}/config` эндпоинты
6. Документ `plugins/PLUGIN_API.md` — как написать плагин

---

## Проверка готовности

- [ ] `plugins/` папка создана, но пустая — сервер стартует без ошибок
- [ ] Плагин с неверным manifest.json — пропускается с warning в логе, остальное работает
- [ ] Плагин бросает исключение в хуке — логируется, другие плагины не падают
- [ ] `GET /api/plugins` возвращает список
- [ ] Кастомный `@http.get("/test")` отвечает на `/api/plugins/{id}/test`
- [ ] `@scheduled` срабатывает по cron без рестарта
- [ ] pytest — все существующие 20 тестов проходят (плагин-движок не ломает ничего)
