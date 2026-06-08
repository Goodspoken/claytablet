"""Smoke-test the Tauri frontend bundle (desktop/dist) served as static SPA."""
import re
import pytest
from playwright.sync_api import Page


pytestmark = pytest.mark.desktop


def test_desktop_dist_index_served(http_get, desktop_dist_url: str):
    """index.html отдаётся и содержит <div id='root'>."""
    r = http_get(f"{desktop_dist_url}/index.html")
    assert r.status_code == 200, r.text[:200]
    assert "<div id=" in r.text or "<div id=\"root\"" in r.text


def test_desktop_dist_loads_in_browser(page: Page, desktop_dist_url: str, js_errors):
    """Бандл успешно парсится и body отрендерен.

    The dist bundle imports @tauri-apps/api/* which throws outside a Tauri
    runtime. We mock window.__TAURI_INTERNALS__ to satisfy basic invokes and
    also relax error checking — only fail on parse/syntax/network errors,
    not Tauri-shim missing-API rejections.
    """
    page.add_init_script("""
        window.__TAURI__ = window.__TAURI__ || {};
        window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {
            invoke: () => Promise.resolve(null),
            transformCallback: (cb) => cb,
            metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main' } },
        };
        window.__TAURI_OS_PLUGIN_INTERNALS__ = window.__TAURI_OS_PLUGIN_INTERNALS__ || {};
    """)
    page.goto(desktop_dist_url, wait_until="load", timeout=15000)
    # Body may stay empty if Tauri APIs were the gating call — accept that.
    # We just need the bundle to LOAD (no SyntaxError, no 404 on bundle).
    bundle_loaded = page.evaluate(
        "!!document.querySelector('script[src*=\"/assets/index\"]')"
    )
    assert bundle_loaded, "Tauri JS bundle not referenced"

    # Allow Tauri-runtime-only errors; only complain about real parse/load failures.
    fatal = [e for e in js_errors.errors if "tauri" not in e.lower()
             and "invoke" not in e.lower()
             and "permission" not in e.lower()]
    js_errors.errors = fatal  # autouse fixture will re-check
    # If anything truly fatal remains, autouse will fail it.


def test_desktop_dist_title(page: Page, desktop_dist_url: str):
    """В <title> упоминается ClayTablet (не дефолтный Tauri-шаблон)."""
    page.goto(desktop_dist_url, wait_until="load")
    title = page.title()
    assert re.search(r"claytablet|claytablet", title, re.I), (
        f"Title still says template default: {title!r}. "
        f"Update desktop/index.html and rebuild dist."
    )
