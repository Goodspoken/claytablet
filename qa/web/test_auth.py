"""Auth modal smoke tests — verifies the sign-in UI surfaces."""
import re
import pytest
from playwright.sync_api import Page, expect


def test_sign_in_button_visible_when_logged_out(page: Page, target_url: str):
    """Кнопка 'Войти' видна для анонимного пользователя."""
    page.goto(target_url, wait_until="networkidle")
    # button text — RU or EN
    btn = page.get_by_role("button", name=re.compile(r"sign in|войти", re.I)).first
    expect(btn).to_be_visible()


def test_auth_modal_opens(page: Page, target_url: str):
    """Клик по 'Sign in' открывает модалку с провайдерами Google/Yandex."""
    page.goto(target_url, wait_until="networkidle")
    btn = page.get_by_role("button", name=re.compile(r"sign in|войти", re.I)).first
    btn.click()

    # AuthModal surfaces Google + Yandex as <a> links to /api/auth/{provider}/login
    google = page.get_by_role("link", name=re.compile(r"google", re.I))
    yandex = page.get_by_role("link", name=re.compile(r"yandex|яндекс", re.I))
    expect(google).to_be_visible(timeout=5000)
    expect(yandex).to_be_visible()
    # hrefs point at OAuth start endpoints
    assert "/api/auth/google/login" in (google.get_attribute("href") or "")
    assert "/api/auth/yandex/login" in (yandex.get_attribute("href") or "")


def test_auth_modal_closes_on_escape(page: Page, target_url: str):
    """Escape закрывает AuthModal."""
    page.goto(target_url, wait_until="networkidle")
    btn = page.get_by_role("button", name=re.compile(r"sign in|войти", re.I)).first
    btn.click()
    google = page.get_by_role("link", name=re.compile(r"google", re.I))
    expect(google).to_be_visible()
    page.keyboard.press("Escape")
    expect(google).to_be_hidden(timeout=3000)
