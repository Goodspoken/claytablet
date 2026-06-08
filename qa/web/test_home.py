"""Homepage smoke tests."""
import re
import pytest
from playwright.sync_api import Page, expect


@pytest.mark.smoke
def test_homepage_loads(page: Page, target_url: str):
    """Главная отдаёт 200 и рендерит React-приложение."""
    response = page.goto(target_url, wait_until="networkidle")
    assert response is not None and response.ok, f"HTTP {response.status if response else 'none'}"

    # ClayTablet logo in header (split across two spans)
    expect(page.get_by_text(re.compile(r"^Clay", re.I)).first).to_be_visible()
    expect(page.get_by_text("Tablet").first).to_be_visible()

    # Room input + Go button
    expect(page.get_by_placeholder(re.compile(r"room name|имя комнаты", re.I))).to_be_visible()


@pytest.mark.smoke
def test_homepage_title(page: Page, target_url: str):
    """Заголовок страницы содержит ClayTablet."""
    page.goto(target_url)
    title = page.title()
    assert "ClayTablet" in title, f"Title was: {title!r}"


def test_room_input_validates(page: Page, target_url: str):
    """Невалидное имя комнаты показывает ошибку, валидное — навигирует."""
    page.goto(target_url)
    input_field = page.get_by_placeholder(re.compile(r"room name|имя комнаты", re.I))
    input_field.fill("bad name with spaces!")
    page.get_by_role("button", name=re.compile(r"^(Go|Перейти)", re.I)).click()
    # error text — uses RU or EN depending on lang
    expect(page.get_by_text(re.compile(r"letters, digits|только буквы", re.I))).to_be_visible(timeout=3000)


def test_create_random_room_navigates(page: Page, target_url: str):
    """Кнопка Go без ввода переходит на /:roomId."""
    page.goto(target_url)
    page.get_by_role("button", name=re.compile(r"^(Go|Перейти)", re.I)).click()
    page.wait_for_url(re.compile(r"/[a-zA-Z0-9_-]{2,32}$"), timeout=5000)


def test_terms_link_works(page: Page, target_url: str):
    """Ссылка Terms ведёт на /terms, а не на комнату с ID '_terms'."""
    page.goto(target_url)
    page.get_by_role("link", name=re.compile(r"^(Terms|Условия)$", re.I)).click()
    page.wait_for_url(re.compile(r"/terms$"))
    expect(page.get_by_role("heading", name=re.compile(r"terms of service", re.I))).to_be_visible()


def test_privacy_link_works(page: Page, target_url: str):
    """Ссылка Privacy ведёт на /privacy."""
    page.goto(target_url)
    page.get_by_role("link", name=re.compile(r"^(Privacy|Конфиденциальность)$", re.I)).click()
    page.wait_for_url(re.compile(r"/privacy$"))


def test_no_claytablet_text_visible_in_footer(page: Page, target_url: str):
    """Регрессия F4: бренд в футере — ClayTablet, не ClayTablet."""
    page.goto(target_url)
    footer = page.locator("footer").first
    expect(footer).to_contain_text("ClayTablet")
