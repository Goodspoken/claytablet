"""
DubTab Plugin SDK — imported by plugins via `from dubtab_sdk import ...`

The PluginManager injects itself into each plugin module's globals before execution,
so decorators can register hooks/routes/schedules into the live manager instance.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from plugin_manager import PluginManager

logger = logging.getLogger("dubtab.plugin_sdk")

# Set by PluginManager.load_plugins() before each plugin module is executed.
# Each plugin gets its own SDK context object so there's no global state bleed.
_current_manager: "PluginManager | None" = None
_current_plugin_id: str = ""


def _set_context(manager: "PluginManager", plugin_id: str) -> None:
    global _current_manager, _current_plugin_id
    _current_manager = manager
    _current_plugin_id = plugin_id


def _clear_context() -> None:
    global _current_manager, _current_plugin_id
    _current_manager = None
    _current_plugin_id = ""


# ---------------------------------------------------------------------------
# @hook decorator
# ---------------------------------------------------------------------------

def hook(hook_name: str) -> Callable:
    """Register an async function as a handler for a lifecycle hook.

    Usage::

        @hook("on_text_added")
        async def handle(room_id: str, content: str, item_id: str) -> None:
            ...
    """
    def decorator(fn: Callable) -> Callable:
        if _current_manager is not None:
            _current_manager.register_hook(hook_name, fn, _current_plugin_id)
        else:
            logger.warning("@hook used outside plugin load context — ignored")
        return fn
    return decorator


# ---------------------------------------------------------------------------
# @scheduled decorator
# ---------------------------------------------------------------------------

def scheduled(cron: str) -> Callable:
    """Register an async function to run on a cron schedule (APScheduler syntax).

    Usage::

        @scheduled(cron="0 * * * *")   # every hour at :00
        async def fetch() -> None:
            ...
    """
    def decorator(fn: Callable) -> Callable:
        if _current_manager is not None:
            _current_manager.register_scheduled(cron, fn, _current_plugin_id)
        else:
            logger.warning("@scheduled used outside plugin load context — ignored")
        return fn
    return decorator


# ---------------------------------------------------------------------------
# http namespace — @http.get / @http.post / @http.delete
# ---------------------------------------------------------------------------

class _HttpNamespace:
    """Provides @http.get(path), @http.post(path), @http.delete(path) decorators."""

    def _register(self, method: str, path: str) -> Callable:
        def decorator(fn: Callable) -> Callable:
            if _current_manager is not None:
                _current_manager.register_route(method, path, fn, _current_plugin_id)
            else:
                logger.warning("@http.%s used outside plugin load context — ignored", method)
            return fn
        return decorator

    def get(self, path: str) -> Callable:
        return self._register("GET", path)

    def post(self, path: str) -> Callable:
        return self._register("POST", path)

    def delete(self, path: str) -> Callable:
        return self._register("DELETE", path)


http = _HttpNamespace()


# ---------------------------------------------------------------------------
# api — DubTab internal API for plugins
# ---------------------------------------------------------------------------

class _PluginAPI:
    """Thin async wrapper around DubTab's internal operations.

    Plugins call e.g. ``await api.add_text(room_id, content)`` without
    having to import SQLAlchemy or know the DB schema.
    """

    async def add_text(self, room_id: str, content: str) -> str:
        """Post a text item to a room. Returns the new item_id."""
        import uuid
        import time
        import database
        import models

        db = database.SessionLocal()
        try:
            item = models.Item(
                id=str(uuid.uuid4()),
                room_id=room_id,
                item_type="text",
                content=content[:100_000],
                timestamp=time.time(),
            )
            db.add(item)
            # touch room (create if needed)
            room = db.query(models.Room).filter(models.Room.id == room_id).first()
            if room:
                room.last_activity = time.time()
            db.commit()
            return item.id
        finally:
            db.close()

    async def get_items(self, room_id: str) -> list[dict]:
        """Return all items in a room as plain dicts."""
        import database
        import models

        db = database.SessionLocal()
        try:
            items = (
                db.query(models.Item)
                .filter(models.Item.room_id == room_id)
                .order_by(models.Item.timestamp.desc())
                .all()
            )
            result = []
            for i in items:
                d: dict = {"id": i.id, "type": i.item_type, "timestamp": i.timestamp}
                if i.item_type == "text":
                    d["content"] = i.content
                elif i.item_type in ("image", "audio", "file"):
                    d["url"] = i.url
                    d["filename"] = i.filename
                elif i.item_type == "chat":
                    d["author"] = i.author
                    d["text"] = i.text
                result.append(d)
            return result
        finally:
            db.close()

    async def delete_item(self, room_id: str, item_id: str) -> None:
        """Delete a single item by id."""
        import database
        import models

        db = database.SessionLocal()
        try:
            item = (
                db.query(models.Item)
                .filter(models.Item.id == item_id, models.Item.room_id == room_id)
                .first()
            )
            if item:
                db.delete(item)
                db.commit()
        finally:
            db.close()

    async def get_room_settings(self, room_id: str) -> dict:
        """Return room settings as a plain dict, or {} if room doesn't exist."""
        import database
        import models

        db = database.SessionLocal()
        try:
            room = db.query(models.Room).filter(models.Room.id == room_id).first()
            if not room:
                return {}
            return {
                "ttl": room.ttl,
                "is_protected": bool(room.password_hash),
                "is_readonly": bool(room.is_readonly),
                "is_public": bool(room.is_public),
                "is_system": bool(room.is_system),
            }
        finally:
            db.close()


api = _PluginAPI()
