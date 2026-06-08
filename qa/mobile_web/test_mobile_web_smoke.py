"""Mobile web (Expo web) smoke tests.

Skipped unless `MOBILE_WEB_URL` resolves OR `expo start --web` is running
on http://localhost:8081. Run with:
    cd mobile && npm run web        # in one terminal
    pytest qa/mobile_web -v          # in another
"""
import re
import pytest
from playwright.sync_api import Page


pytestmark = pytest.mark.mobile_web


def test_mobile_web_loads(page: Page, mobile_web_url: str):
    """Expo web bundle грузится, корневой div рендерится.

    Metro hot-bundles on first request and can take 60+s; we wait on
    'domcontentloaded' rather than 'load' to skip slow asset prefetch."""
    response = page.goto(mobile_web_url, wait_until="domcontentloaded", timeout=90000)
    assert response is not None and response.ok, f"HTTP {response.status if response else 'none'}"
    page.wait_for_function(
        "document.body && document.body.innerText.trim().length > 0",
        timeout=60000,
    )


def test_mobile_web_renders_app_ui(page: Page, mobile_web_url: str):
    """Внутри DOM появляется ожидаемый UI приложения (а не дефолтная заглушка Expo)."""
    page.goto(mobile_web_url, wait_until="domcontentloaded", timeout=90000)
    page.wait_for_function(
        "document.body && document.body.innerText.trim().length > 0",
        timeout=60000,
    )
    body_text = (page.evaluate("document.body && document.body.innerText || ''") or "").lower()
    # match either brand name OR app-specific UI strings (RU and EN variants)
    app_markers = [
        "claytablet", "claytablet", "popycast",
        "перейти", "комнат", "сканировать",  # RU app vocabulary
        "go", "room", "scan",                # EN app vocabulary
    ]
    matched = [m for m in app_markers if m in body_text]
    assert matched, (
        f"None of the expected markers found. Body starts with: {body_text[:200]!r}"
    )


def test_mobile_web_no_blocking_console_errors(page: Page, mobile_web_url: str, js_errors):
    """Загрузка mobile web не валит фатальные ошибки в консоль."""
    page.goto(mobile_web_url, wait_until="networkidle", timeout=30000)
    # autouse fixture in qa/conftest.py asserts js_errors.fail_if_any()
