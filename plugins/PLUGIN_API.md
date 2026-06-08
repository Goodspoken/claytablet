# ClayTablet Plugin API

## Установка плагина

1. Скопируй папку плагина в `plugins/`
2. При наличии `requirements.txt` — установи зависимости: `pip install -r plugins/<id>/requirements.txt`
3. Перезапусти сервер: `docker compose restart backend`

## Структура плагина

```
plugins/
  my-plugin/
    manifest.json     ← обязательно
    plugin.py         ← обязательно
    config.json       ← создаётся пользователем на основе config.json.example
    requirements.txt  ← опционально
```

## manifest.json

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "your-name",
  "description": "Что делает плагин",
  "hooks": ["on_startup", "on_text_added"],
  "min_claytablet_version": "0.2.1"
}
```

## plugin.py — пример

```python
from claytablet_sdk import hook, scheduled, http, api

@hook("on_startup")
async def init():
    print("[my-plugin] loaded!")

@hook("on_text_added")
async def on_text(room_id: str, content: str, item_id: str):
    # Вызывается каждый раз когда кто-то добавляет текст в любую комнату
    print(f"New text in {room_id}: {content[:50]}")

@scheduled(cron="0 * * * *")   # каждый час
async def hourly_job():
    await api.add_text("my-room", "Hourly ping!")

@http.get("/status")            # → GET /api/plugins/my-plugin/status
async def status(request):
    return {"ok": True}
```

## Доступные хуки

| Хук | Аргументы | Когда срабатывает |
|---|---|---|
| `on_startup` | — | Сервер стартовал |
| `on_shutdown` | — | Сервер останавливается |
| `on_text_added` | `room_id, content, item_id` | Добавлен текст |
| `on_image_added` | `room_id, filename, item_id` | Загружено изображение |
| `on_item_deleted` | `room_id, item_id` | Удалён элемент |
| `on_room_created` | `room_id` | Создана новая комната |

## Plugin API (api.*)

```python
await api.add_text(room_id, content)        # → item_id: str
await api.get_items(room_id)                # → list[dict]
await api.delete_item(room_id, item_id)     # → None
await api.get_room_settings(room_id)        # → dict
```

## HTTP-эндпоинты плагина

```python
@http.get("/path")      # GET  /api/plugins/<id>/path
@http.post("/path")     # POST /api/plugins/<id>/path
@http.delete("/path")   # DELETE /api/plugins/<id>/path
```

Функция получает `request: fastapi.Request` и должна вернуть dict/list (сериализуется в JSON) или `fastapi.Response`.

## Системные эндпоинты

| Метод | URL | Описание |
|---|---|---|
| `GET` | `/api/plugins` | Список всех установленных плагинов |
| `GET` | `/api/plugins/{id}/config` | Прочитать config.json плагина |
| `POST` | `/api/plugins/{id}/config` | Сохранить config.json плагина |

## Важные ограничения

- Плагины запускаются в том же процессе, что и сервер — **полное доверие**
- Ошибка в хуке логируется, но не роняет сервер и не мешает другим плагинам
- `api.add_text` создаёт новую DB-сессию — не передавай SQLAlchemy-объекты между вызовами
- Для `@scheduled` нужен `apscheduler` в системном окружении (уже в requirements.txt сервера)
