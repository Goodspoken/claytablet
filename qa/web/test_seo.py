"""SEO smoke tests — robots, sitemap, og: meta tags."""
import re
import pytest
from playwright.sync_api import Page


pytestmark = pytest.mark.seo


def test_robots_txt_served(http_get, target_url):
    """GET /robots.txt -> 200, содержит User-agent и Sitemap."""
    r = http_get(f"{target_url}/robots.txt")
    assert r.status_code == 200, f"HTTP {r.status_code}"
    body = r.text
    assert re.search(r"User-agent:\s*\*", body, re.I), "Missing User-agent"
    assert "Sitemap:" in body, "Missing Sitemap directive"
    # Rooms should be off-limits to crawlers
    assert "Disallow:" in body, "No Disallow rules"


def test_sitemap_xml_served(http_get, target_url):
    """GET /sitemap.xml -> 200, валидный XML с урлами."""
    r = http_get(f"{target_url}/sitemap.xml")
    assert r.status_code == 200, f"HTTP {r.status_code}"
    assert "<?xml" in r.text, "Not an XML document"
    assert "<urlset" in r.text, "No urlset"
    assert "<loc>" in r.text, "No <loc> entries"


def test_og_meta_tags_present(page: Page, target_url):
    """Главная содержит og:title, og:description, og:image, og:url."""
    page.goto(target_url)
    required = ["og:title", "og:description", "og:image", "og:url", "og:type"]
    for prop in required:
        loc = page.locator(f'meta[property="{prop}"]')
        count = loc.count()
        assert count > 0, f"Missing <meta property='{prop}'>"
        content = loc.first.get_attribute("content")
        assert content, f"Empty content for {prop}"


def test_twitter_card_meta_present(page: Page, target_url):
    """Главная содержит twitter:card."""
    page.goto(target_url)
    card = page.locator('meta[name="twitter:card"]').first
    content = card.get_attribute("content")
    assert content in ("summary_large_image", "summary"), f"Unexpected twitter:card: {content}"


def test_canonical_url_present(page: Page, target_url):
    """Главная содержит <link rel='canonical'>."""
    page.goto(target_url)
    canonical = page.locator('link[rel="canonical"]').first
    href = canonical.get_attribute("href")
    assert href and href.startswith("http"), f"Bad canonical: {href}"


def test_html_has_lang_attr(page: Page, target_url):
    """<html> имеет атрибут lang."""
    page.goto(target_url)
    lang = page.locator("html").get_attribute("lang")
    assert lang, "Missing html[lang]"
    assert re.match(r"^[a-z]{2}", lang), f"Unexpected lang: {lang}"


def test_description_meta_present(page: Page, target_url):
    """Есть meta name='description'."""
    page.goto(target_url)
    desc = page.locator('meta[name="description"]').first.get_attribute("content")
    assert desc and len(desc) > 30, f"Description too short: {desc!r}"


def test_manifest_linked(page: Page, target_url):
    """PWA manifest подключён."""
    page.goto(target_url)
    link = page.locator('link[rel="manifest"]').first
    href = link.get_attribute("href")
    assert href, "No manifest link"
