# Трек: RSS Auto-Post Plugin — Первый встроенный плагин

**Статус:** 🔵 Планирование  
**Приоритет:** 🟡 Средний  
**Дата создания:** 2026-05-08  
**Зависит от:** Трек Plugin Engine

---

## Цель

Реализовать первый рабочий плагин — RSS Auto-Post. Цели двойные:
1. Доказать что Plugin Engine работает (proof of concept)
2. Дать пользователям готовый пример «как писать плагины»

Плагин парсит RSS/Atom-ленты по расписанию и постит новые записи в указанные комнаты. Никакой лишней инфраструктуры — просто `feedparser` + `@scheduled`.

---

## Структура

```
plugins/
  rss-fetcher/
    manifest.json
    plugin.py
    config.json.example      # пример конфига — пользователь копирует в config.json
    README.md                # установка и настройка
```

---

## manifest.json

```json
{
  "id": "rss-fetcher",
  "name": "RSS Auto-Post",
  "version": "1.0.0",
  "author": "ClayTablet Team",
  "description": "Автоматически постит новые записи из RSS/Atom-лент в комнаты.",
  "hooks": ["on_startup", "scheduled", "http_get"],
  "min_claytablet_version": "0.2.1"
}
```

---

## config.json.example

```json
{
  "feeds": [
    {
      "url": "https://hnrss.org/frontpage",
      "room_id": "hacker-news",
      "limit": 5,
      "interval_hours": 1,
      "prefix": "📰"
    },
    {
      "url": "https://github.com/Goodspoken/claytablet/releases.atom",
      "room_id": "_log",
      "limit": 3,
      "interval_hours": 24,
      "prefix": "🚀"
    }
  ],
  "dedup_hours": 24
}
```

**Поля:**
- `url` — RSS/Atom-лента
- `room_id` — комната для публикации
- `limit` — максимум записей за один прогон
- `interval_hours` — как часто проверять (1 = каждый час)
- `prefix` — эмодзи-префикс перед заголовком
- `dedup_hours` — не постить одно и то же N часов (хранит seen-список в памяти)

---

## plugin.py — логика

```python
import json
import time
from pathlib import Path
from claytablet_sdk import hook, scheduled, http, api
import feedparser

PLUGIN_DIR = Path(__file__).parent
_seen: dict[str, float] = {}   # url → timestamp последней публикации

def load_config() -> dict:
    cfg = PLUGIN_DIR / "config.json"
    if not cfg.exists():
        return {"feeds": [], "dedup_hours": 24}
    return json.loads(cfg.read_text())

@hook("on_startup")
async def init():
    cfg = load_config()
    n = len(cfg.get("feeds", []))
    print(f"[rss-fetcher] loaded, {n} feed(s) configured")

@scheduled(cron="0 * * * *")   # каждый час
async def fetch_all():
    cfg = load_config()
    dedup_sec = cfg.get("dedup_hours", 24) * 3600
    now = time.time()

    for feed_cfg in cfg.get("feeds", []):
        url = feed_cfg["url"]
        room_id = feed_cfg["room_id"]
        limit = feed_cfg.get("limit", 5)
        prefix = feed_cfg.get("prefix", "📰")
        interval_sec = feed_cfg.get("interval_hours", 1) * 3600

        # Пропускаем если ещё не время
        last_run = _seen.get(f"__run_{url}", 0)
        if now - last_run < interval_sec:
            continue
        _seen[f"__run_{url}"] = now

        try:
            d = feedparser.parse(url)
        except Exception as e:
            print(f"[rss-fetcher] parse error {url}: {e}")
            continue

        posted = 0
        for entry in d.entries[:limit]:
            entry_id = entry.get("id") or entry.get("link", "")
            last_posted = _seen.get(entry_id, 0)
            if now - last_posted < dedup_sec:
                continue
            text = f"{prefix} {entry.get('title', '(без заголовка)')}\n{entry.get('link', '')}"
            try:
                await api.add_text(room_id, text)
                _seen[entry_id] = now
                posted += 1
            except Exception as e:
                print(f"[rss-fetcher] post error {room_id}: {e}")

        if posted:
            print(f"[rss-fetcher] posted {posted} item(s) from {url} → {room_id}")

@http.get("/status")            # GET /api/plugins/rss-fetcher/status
async def get_status(request):
    cfg = load_config()
    return {
        "feeds": len(cfg.get("feeds", [])),
        "seen_entries": len([k for k in _seen if not k.startswith("__run_")]),
    }

@http.get("/config")            # GET /api/plugins/rss-fetcher/config
async def get_config(request):
    return load_config()
```

---

## README.md плагина

```markdown
# RSS Auto-Post Plugin

Автоматически постит новые записи из RSS/Atom-лент в комнаты ClayTablet.

## Установка

1. Скопируй папку `rss-fetcher/` в `plugins/` вашего сервера
2. Установи зависимость: `pip install feedparser`
3. Скопируй `config.json.example` → `config.json` и отредактируй
4. Перезапусти сервер: `docker compose restart backend`

## Проверка

GET /api/plugins/rss-fetcher/status → {"feeds": 2, "seen_entries": 17}

## Конфигурация

Правь `plugins/rss-fetcher/config.json` — изменения применяются
при следующем запуске по расписанию (без рестарта).
```

---

## Зависимости

Добавить в `plugins/rss-fetcher/requirements.txt`:
```
feedparser>=6.0
```

Пользователь ставит вручную: `pip install feedparser` (или в Dockerfile если кастомный образ).

---

## Порядок реализации

1. Создать `plugins/rss-fetcher/manifest.json`
2. Создать `plugins/rss-fetcher/plugin.py`
3. Создать `plugins/rss-fetcher/config.json.example`
4. Создать `plugins/rss-fetcher/README.md`
5. Проверить что плагин грузится и `on_startup` срабатывает
6. Проверить что `@scheduled` постит в комнату
7. Проверить `GET /api/plugins/rss-fetcher/status`

---

## Проверка готовности

- [ ] Пустой `config.json` (нет feeds) — плагин стартует без ошибок
- [ ] Валидная лента — записи появляются в комнате по расписанию
- [ ] Дедупликация — одна и та же запись не постится дважды за `dedup_hours`
- [ ] Недоступная лента — ошибка в логе, остальные ленты продолжают работать
- [ ] `GET /api/plugins/rss-fetcher/status` — корректные данные
- [ ] Несуществующая `room_id` — ошибка в логе, не крашит плагин
