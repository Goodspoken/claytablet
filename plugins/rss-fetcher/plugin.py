"""
RSS Auto-Post Plugin for ClayTablet
====================================
Автоматически парсит RSS/Atom-ленты по расписанию и постит
новые записи в указанные комнаты. Поддерживает дедупликацию.

Использование:
  1. Скопируй config.json.example → config.json
  2. Отредактируй feeds
  3. Перезапусти сервер: docker compose restart backend
"""
import json
import logging
import time
from pathlib import Path

from plugin_sdk import api, hook, http, scheduled

logger = logging.getLogger("claytablet.plugins.rss-fetcher")

PLUGIN_DIR = Path(__file__).parent

# In-memory dedup store: entry_url/id → timestamp последней публикации
# Key prefix "__run_<feed_url>" хранит время последнего запуска ленты
_seen: dict[str, float] = {}


def load_config() -> dict:
    """Загружает config.json. Если не существует — возвращает пустой конфиг."""
    cfg_path = PLUGIN_DIR / "config.json"
    if not cfg_path.exists():
        return {"feeds": [], "dedup_hours": 24}
    try:
        return json.loads(cfg_path.read_text(encoding="utf-8"))
    except Exception as e:
        logger.error("[rss-fetcher] Failed to load config.json: %s", e)
        return {"feeds": [], "dedup_hours": 24}


@hook("on_startup")
async def init() -> None:
    cfg = load_config()
    n = len(cfg.get("feeds", []))
    if n == 0:
        logger.info("[rss-fetcher] loaded — no feeds configured (copy config.json.example → config.json)")
    else:
        logger.info("[rss-fetcher] loaded — %d feed(s) configured", n)


@scheduled(cron="0 * * * *")  # каждый час в :00
async def fetch_all() -> None:
    """Основной цикл: проходим по всем лентам и постим новые записи."""
    try:
        import feedparser  # type: ignore[import]
    except ImportError:
        logger.error("[rss-fetcher] feedparser not installed. Run: pip install feedparser")
        return

    cfg = load_config()
    feeds = cfg.get("feeds", [])
    if not feeds:
        return

    dedup_sec = float(cfg.get("dedup_hours", 24)) * 3600
    now = time.time()

    for feed_cfg in feeds:
        url: str = feed_cfg.get("url", "").strip()
        room_id: str = feed_cfg.get("room_id", "").strip()
        if not url or not room_id:
            logger.warning("[rss-fetcher] Skipping feed with missing url or room_id")
            continue

        limit: int = int(feed_cfg.get("limit", 5))
        prefix: str = feed_cfg.get("prefix", "📰")
        interval_sec = float(feed_cfg.get("interval_hours", 1)) * 3600

        # Пропускаем если ещё рано
        last_run = _seen.get(f"__run_{url}", 0.0)
        if now - last_run < interval_sec:
            continue
        _seen[f"__run_{url}"] = now

        # Парсим ленту
        try:
            d = feedparser.parse(url)
        except Exception as e:
            logger.error("[rss-fetcher] Parse error %s: %s", url, e)
            continue

        if d.bozo and not d.entries:
            logger.warning("[rss-fetcher] Feed %s returned malformed data", url)

        posted = 0
        for entry in d.entries[:limit]:
            # Уникальный идентификатор записи
            entry_id: str = entry.get("id") or entry.get("link") or entry.get("title", "")
            if not entry_id:
                continue

            # Проверяем дедупликацию
            last_posted = _seen.get(entry_id, 0.0)
            if now - last_posted < dedup_sec:
                continue

            title: str = entry.get("title", "(без заголовка)").strip()
            link: str = entry.get("link", "").strip()
            summary: str = entry.get("summary", "").strip()

            # Формируем текст поста
            lines = [f"{prefix} **{title}**"]
            if link:
                lines.append(link)
            if summary and len(summary) < 300:
                # Убираем HTML-теги простой заменой
                clean = summary.replace("<br>", "\n").replace("<br/>", "\n")
                import re
                clean = re.sub(r"<[^>]+>", "", clean).strip()
                if clean:
                    lines.append(f"\n{clean[:280]}…" if len(clean) > 280 else f"\n{clean}")

            text = "\n".join(lines)

            try:
                await api.add_text(room_id, text)
                _seen[entry_id] = now
                posted += 1
            except Exception as e:
                logger.error("[rss-fetcher] Post error → %s: %s", room_id, e)

        if posted:
            logger.info("[rss-fetcher] Posted %d item(s) from %s → %s", posted, url, room_id)


@http.get("/status")  # GET /api/plugins/rss-fetcher/status
async def get_status(request) -> dict:
    """Статус плагина: сколько лент и записей в памяти."""
    cfg = load_config()
    run_keys = [k for k in _seen if k.startswith("__run_")]
    entry_keys = [k for k in _seen if not k.startswith("__run_")]
    return {
        "plugin": "rss-fetcher",
        "version": "1.0.0",
        "feeds_configured": len(cfg.get("feeds", [])),
        "seen_entries": len(entry_keys),
        "feeds_last_run": {
            k.removeprefix("__run_"): time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(v))
            for k, v in _seen.items()
            if k in run_keys
        },
    }


@http.get("/config")  # GET /api/plugins/rss-fetcher/config
async def get_config_endpoint(request) -> dict:
    """Возвращает текущий config.json."""
    return load_config()


@http.post("/fetch-now")  # POST /api/plugins/rss-fetcher/fetch-now
async def fetch_now(request) -> dict:
    """Немедленно запускает fetch_all (для отладки, сбрасывает таймеры)."""
    # Сбрасываем таймеры последнего запуска чтобы прогон прошёл
    for key in list(_seen.keys()):
        if key.startswith("__run_"):
            del _seen[key]
    await fetch_all()
    return {"status": "ok", "message": "fetch triggered"}
