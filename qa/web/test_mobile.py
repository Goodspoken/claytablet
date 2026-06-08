"""Mobile layout tests on iPhone 13 viewport (390x844)."""
import re
import pytest
from playwright.sync_api import Page, expect


pytestmark = pytest.mark.mobile


def test_mobile_homepage_renders(mobile_page: Page, target_url: str):
    """Главная грузится в мобильном viewport, ключевые элементы видимы."""
    mobile_page.goto(target_url, wait_until="networkidle")
    # Logo
    expect(mobile_page.get_by_text(re.compile(r"^Clay", re.I)).first).to_be_visible()
    # Input + Go button (must be reachable)
    expect(mobile_page.get_by_placeholder(re.compile(r"room name|имя комнаты", re.I))).to_be_visible()
    expect(mobile_page.get_by_role("button", name=re.compile(r"^(Go|Перейти)", re.I))).to_be_visible()


def test_mobile_no_horizontal_overflow(mobile_page: Page, target_url: str):
    """Горизонтального скролла не должно быть на 390px."""
    mobile_page.goto(target_url, wait_until="networkidle")
    # scrollWidth vs innerWidth — небольшой допуск 1px на округление
    overflow = mobile_page.evaluate("""() => {
        const body = document.body;
        const html = document.documentElement;
        const docWidth = Math.max(body.scrollWidth, html.scrollWidth);
        return docWidth - window.innerWidth;
    }""")
    assert overflow <= 1, f"Horizontal overflow detected: {overflow}px"


def test_mobile_viewport_meta(mobile_page: Page, target_url: str):
    """<meta name=viewport> правильный для мобильных."""
    mobile_page.goto(target_url)
    content = mobile_page.locator('meta[name="viewport"]').get_attribute("content")
    assert content and "width=device-width" in content
    assert "initial-scale=1" in content


def test_mobile_input_focusable(mobile_page: Page, target_url: str):
    """Инпут фокусируется по тапу (или через JS — Playwright tap)."""
    mobile_page.goto(target_url)
    inp = mobile_page.get_by_placeholder(re.compile(r"room name|имя комнаты", re.I))
    inp.tap()
    # input must be focused
    focused = mobile_page.evaluate("document.activeElement && document.activeElement.tagName")
    assert focused == "INPUT", f"Expected INPUT to be focused, got {focused}"
