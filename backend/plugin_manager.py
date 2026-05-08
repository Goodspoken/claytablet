"""
ClayTablet Plugin Manager

Scans the plugins/ directory on startup, loads each plugin.py module,
registers hooks/schedules/routes, and fires hooks at runtime.
"""
from __future__ import annotations

import importlib.util
import json
import logging
import sys
from pathlib import Path
from typing import Any, Callable

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("claytablet.plugins")


class PluginManager:
    def __init__(self) -> None:
        # hook_name → list of (plugin_id, async callable)
        self._hooks: dict[str, list[tuple[str, Callable]]] = {}
        # list of (cron, plugin_id, async callable)
        self._scheduled: list[tuple[str, str, Callable]] = []
        # list of (method, path, plugin_id, callable)
        self._routes: list[tuple[str, str, str, Callable]] = []
        # loaded plugin manifests
        self._plugins: list[dict] = []
        self._scheduler = None  # APScheduler instance, created lazily

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def load_plugins(self, plugins_dir: Path) -> None:
        """Scan plugins_dir, load each valid plugin subdirectory."""
        if not plugins_dir.exists():
            logger.info("plugins/ directory not found — no plugins loaded")
            return

        for plugin_dir in sorted(plugins_dir.iterdir()):
            if not plugin_dir.is_dir():
                continue
            self._load_one(plugin_dir)

    def _load_one(self, plugin_dir: Path) -> None:
        manifest_path = plugin_dir / "manifest.json"
        plugin_path = plugin_dir / "plugin.py"

        if not manifest_path.exists():
            logger.warning("Plugin dir %s has no manifest.json — skipped", plugin_dir.name)
            return
        if not plugin_path.exists():
            logger.warning("Plugin dir %s has no plugin.py — skipped", plugin_dir.name)
            return

        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception as e:
            logger.error("Failed to parse manifest for %s: %s", plugin_dir.name, e)
            return

        plugin_id = manifest.get("id", plugin_dir.name)
        manifest.setdefault("id", plugin_id)
        manifest["_dir"] = str(plugin_dir)
        manifest["_status"] = "error"

        # Add plugin dir to sys.path so plugin.py can do relative imports
        plugin_dir_str = str(plugin_dir)
        if plugin_dir_str not in sys.path:
            sys.path.insert(0, plugin_dir_str)

        # Also ensure backend/ (SDK location) is on sys.path
        backend_dir = str(Path(__file__).parent)
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)

        try:
            # Set SDK context so decorators register into *this* manager
            import plugin_sdk
            plugin_sdk._set_context(self, plugin_id)

            spec = importlib.util.spec_from_file_location(
                f"claytablet_plugin_{plugin_id}", plugin_path
            )
            mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
            spec.loader.exec_module(mod)  # type: ignore[union-attr]

            manifest["_status"] = "loaded"
            self._plugins.append(manifest)
            logger.info(
                "Loaded plugin: %s v%s by %s",
                manifest.get("name", plugin_id),
                manifest.get("version", "?"),
                manifest.get("author", "unknown"),
            )
        except Exception as e:
            logger.error("Failed to load plugin %s: %s", plugin_id, e)
            manifest["_status"] = f"error: {e}"
            self._plugins.append(manifest)
        finally:
            import plugin_sdk
            plugin_sdk._clear_context()

    # ------------------------------------------------------------------
    # Registration (called by SDK decorators during load)
    # ------------------------------------------------------------------

    def register_hook(self, hook_name: str, fn: Callable, plugin_id: str) -> None:
        self._hooks.setdefault(hook_name, []).append((plugin_id, fn))
        logger.debug("Plugin %s registered hook: %s", plugin_id, hook_name)

    def register_scheduled(self, cron: str, fn: Callable, plugin_id: str) -> None:
        self._scheduled.append((cron, plugin_id, fn))
        logger.debug("Plugin %s registered scheduled job: %s", plugin_id, cron)

    def register_route(self, method: str, path: str, fn: Callable, plugin_id: str) -> None:
        self._routes.append((method, path, plugin_id, fn))
        logger.debug("Plugin %s registered route: %s %s", plugin_id, method, path)

    # ------------------------------------------------------------------
    # Firing hooks
    # ------------------------------------------------------------------

    async def fire(self, hook_name: str, **kwargs: Any) -> None:
        """Call all handlers registered for hook_name. Errors are isolated per plugin."""
        import asyncio
        for plugin_id, fn in self._hooks.get(hook_name, []):
            try:
                if asyncio.iscoroutinefunction(fn):
                    await fn(**kwargs)
                else:
                    fn(**kwargs)
            except Exception as e:
                logger.error("Plugin %s hook %s raised: %s", plugin_id, hook_name, e)

    # ------------------------------------------------------------------
    # APScheduler — start after load
    # ------------------------------------------------------------------

    def start_scheduler(self) -> None:
        """Start APScheduler with all registered cron jobs. Call after load_plugins()."""
        if not self._scheduled:
            return
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
            from apscheduler.triggers.cron import CronTrigger
        except ImportError:
            logger.warning(
                "apscheduler not installed — @scheduled jobs will not run. "
                "Add apscheduler to requirements.txt."
            )
            return

        self._scheduler = AsyncIOScheduler()
        for cron, plugin_id, fn in self._scheduled:
            try:
                trigger = CronTrigger.from_crontab(cron)
                self._scheduler.add_job(fn, trigger, id=f"{plugin_id}:{fn.__name__}")
                logger.info("Scheduled job registered: plugin=%s fn=%s cron=%s", plugin_id, fn.__name__, cron)
            except Exception as e:
                logger.error("Plugin %s bad cron '%s': %s", plugin_id, cron, e)

        self._scheduler.start()
        logger.info("Plugin scheduler started with %d job(s)", len(self._scheduler.get_jobs()))

    def stop_scheduler(self) -> None:
        if self._scheduler and self._scheduler.running:
            self._scheduler.shutdown(wait=False)

    # ------------------------------------------------------------------
    # FastAPI router — one router for all plugin HTTP routes
    # ------------------------------------------------------------------

    def get_fastapi_router(self) -> APIRouter:
        """Build and return an APIRouter mounting all plugin HTTP routes.

        Routes are mounted at /api/plugins/{plugin_id}/{path}.
        """
        router = APIRouter(prefix="/api/plugins")

        # List all installed plugins
        @router.get("")
        async def list_plugins():
            return [
                {
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "version": p.get("version"),
                    "author": p.get("author"),
                    "description": p.get("description", ""),
                    "status": p.get("_status", "unknown"),
                }
                for p in self._plugins
            ]

        # Plugin config read/write
        @router.get("/{plugin_id}/config")
        async def get_plugin_config(plugin_id: str):
            plugin_meta = next((p for p in self._plugins if p.get("id") == plugin_id), None)
            if not plugin_meta:
                return JSONResponse({"error": "plugin not found"}, status_code=404)
            cfg_path = Path(plugin_meta["_dir"]) / "config.json"
            if not cfg_path.exists():
                return {}
            try:
                return json.loads(cfg_path.read_text(encoding="utf-8"))
            except Exception:
                return JSONResponse({"error": "config parse error"}, status_code=500)

        @router.post("/{plugin_id}/config")
        async def set_plugin_config(plugin_id: str, request: Request):
            plugin_meta = next((p for p in self._plugins if p.get("id") == plugin_id), None)
            if not plugin_meta:
                return JSONResponse({"error": "plugin not found"}, status_code=404)
            try:
                body = await request.json()
            except Exception:
                return JSONResponse({"error": "invalid JSON"}, status_code=400)
            cfg_path = Path(plugin_meta["_dir"]) / "config.json"
            cfg_path.write_text(json.dumps(body, ensure_ascii=False, indent=2), encoding="utf-8")
            return {"status": "ok"}

        # Dynamic routes registered by plugins via @http.get/post/delete
        for method, path, plugin_id, fn in self._routes:
            full_path = f"/{plugin_id}{path}"
            # Wrap fn so FastAPI sees it as a normal route handler
            _add_route(router, method, full_path, fn)

        return router

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    def list_plugins(self) -> list[dict]:
        return list(self._plugins)


def _add_route(router: APIRouter, method: str, path: str, fn: Callable) -> None:
    """Add a dynamic route to router, supporting GET / POST / DELETE."""
    import asyncio

    async def _handler(request: Request):
        try:
            if asyncio.iscoroutinefunction(fn):
                result = await fn(request)
            else:
                result = fn(request)
            if isinstance(result, (dict, list)):
                return JSONResponse(result)
            return result
        except Exception as e:
            logger.error("Plugin route %s %s error: %s", method, path, e)
            return JSONResponse({"error": str(e)}, status_code=500)

    if method == "GET":
        router.get(path)(_handler)
    elif method == "POST":
        router.post(path)(_handler)
    elif method == "DELETE":
        router.delete(path)(_handler)
    else:
        logger.warning("Unsupported HTTP method %s for plugin route %s", method, path)
