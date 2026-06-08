"""Shared fixtures for ClayTablet E2E tests.

Highlights:
- `page` and `mobile_page` fixtures wrap Playwright's stock fixture and attach
  console + pageerror listeners; collected errors are appended to a list that
  every test can `assert not errors` on at the end.
- `target_url` reads `TARGET_URL` from env (default: http://localhost:5173) so
  the same suite runs against dev, staging, and prod.
- `api_url` derives the backend base URL — same host by default, override with
  `API_URL` if backend is on a different origin.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Callable

import pytest
import requests
from playwright.sync_api import BrowserContext, ConsoleMessage, Page, Playwright, Browser


# Errors collected by listeners are surfaced via this helper class so tests can
# inspect them without relying on globals.
@dataclass
class JSErrorCollector:
    errors: list[str] = field(default_factory=list)
    # Additional per-test ignore patterns (substring, case-insensitive). Useful
    # for suites like `desktop` where Tauri-only APIs throw under a plain
    # browser even with a __TAURI_INTERNALS__ shim.
    extra_ignore: list[str] = field(default_factory=list)

    DEFAULT_CONSOLE_NOISE = (
        "favicon",
        "service worker",
        "serviceworker",
        "401 (unauthorized)",  # /api/auth/me returns 401 for anon
        "[vite]",
        "react-refresh",
    )

    def attach(self, page: Page) -> None:
        page.on("pageerror", self._on_pageerror)
        page.on("console", self._on_console)

    def _is_ignored(self, text: str) -> bool:
        low = text.lower()
        if any(m in low for m in self.DEFAULT_CONSOLE_NOISE):
            return True
        return any(m.lower() in low for m in self.extra_ignore)

    def _on_pageerror(self, exc) -> None:
        msg = str(exc)
        if self._is_ignored(msg):
            return
        self.errors.append(f"pageerror: {msg}")

    def _on_console(self, msg: ConsoleMessage) -> None:
        if msg.type != "error":
            return
        if self._is_ignored(msg.text):
            return
        self.errors.append(f"console.error: {msg.text}")

    def fail_if_any(self) -> None:
        assert not self.errors, "JS errors detected:\n" + "\n".join(self.errors)


# --------------------------------------------------------------------------- #
# Target URL fixtures
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session")
def target_url() -> str:
    return os.environ.get("TARGET_URL", "http://localhost:5173").rstrip("/")


@pytest.fixture(scope="session")
def api_url(target_url: str) -> str:
    return os.environ.get("API_URL", target_url).rstrip("/")


# --------------------------------------------------------------------------- #
# Browser context fixtures (desktop / mobile)
# --------------------------------------------------------------------------- #
@pytest.fixture
def browser_context_args(browser_context_args: dict) -> dict:
    return {
        **browser_context_args,
        "viewport": {"width": 1280, "height": 800},
        "ignore_https_errors": True,
        "locale": "en-US",
    }


@pytest.fixture
def js_errors() -> JSErrorCollector:
    return JSErrorCollector()


@pytest.fixture
def page(context: BrowserContext, js_errors: JSErrorCollector) -> Page:
    """Desktop page with JS error collection wired up."""
    page = context.new_page()
    js_errors.attach(page)
    yield page
    page.close()


@pytest.fixture
def mobile_page(
    playwright: Playwright,
    browser: Browser,
    js_errors: JSErrorCollector,
) -> Page:
    """iPhone 13 viewport (390x844) with touch enabled and JS error collection."""
    iphone = playwright.devices.get("iPhone 13") or {
        "viewport": {"width": 390, "height": 844},
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "device_scale_factor": 3,
        "is_mobile": True,
        "has_touch": True,
    }
    context = browser.new_context(**iphone)
    page = context.new_page()
    js_errors.attach(page)
    yield page
    context.close()


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
@pytest.fixture
def http_get() -> Callable[[str], requests.Response]:
    """Plain HTTP GET — used for headless checks on robots/sitemap/api."""
    session = requests.Session()
    session.headers.update({"User-Agent": "ClayTablet-QA-Bot/1.0"})
    def _get(url: str, **kwargs) -> requests.Response:
        return session.get(url, timeout=10, **kwargs)
    return _get


@pytest.fixture(autouse=True)
def _check_js_errors(js_errors: JSErrorCollector, request):
    """Auto-fail any test if browser logged JS errors during execution.

    Only enforced for tests that actually used a `page` or `mobile_page`
    fixture — pure HTTP tests (`test_api.py`) don't open a browser.
    """
    yield
    used_page = "page" in request.fixturenames or "mobile_page" in request.fixturenames
    if used_page:
        js_errors.fail_if_any()
