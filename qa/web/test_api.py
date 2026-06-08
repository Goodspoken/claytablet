"""Backend API smoke tests — pure HTTP, no browser."""
import re
import pytest


pytestmark = pytest.mark.api


def test_health_endpoint(http_get, api_url):
    """GET /api/health -> 200 OK."""
    r = http_get(f"{api_url}/api/health")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("status") in ("ok", "healthy")


def test_public_rooms_listing(http_get, api_url):
    """GET /api/claytablet/rooms/public -> JSON array."""
    r = http_get(f"{api_url}/api/claytablet/rooms/public")
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, list), f"Expected list, got {type(body)}"


def test_system_rooms_listing(http_get, api_url):
    """GET /api/claytablet/rooms/system -> JSON array."""
    r = http_get(f"{api_url}/api/claytablet/rooms/system")
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, list)


def test_auth_me_unauthenticated(http_get, api_url):
    """GET /api/auth/me без cookie -> 200 с user=null или 401."""
    r = http_get(f"{api_url}/api/auth/me")
    # endpoint may return 200/{"user":null} OR 401 depending on impl
    assert r.status_code in (200, 401), f"Unexpected {r.status_code}: {r.text}"


def test_room_get_creates_room(http_get, api_url):
    """GET /api/claytablet/{room} создаёт комнату если её нет."""
    room_id = "qa-test-room-12345"
    r = http_get(f"{api_url}/api/claytablet/{room_id}")
    assert r.status_code == 200, r.text
    data = r.json()
    # сервер возвращает поля texts/images/audios/chats
    for key in ("texts", "images", "audios", "chats"):
        assert key in data, f"Missing key {key!r}: {list(data.keys())}"


def test_room_invalid_id_rejected(http_get, api_url):
    """Имена с пробелами/спецсимволами должны отклоняться."""
    bad_ids = ["bad name", "../../etc/passwd", "x", "a" * 100]
    for bad in bad_ids:
        r = http_get(f"{api_url}/api/claytablet/{bad}")
        assert r.status_code in (404, 422), (
            f"Bad id {bad!r} returned {r.status_code} (expected 404/422)"
        )


def test_rate_limit_endpoint_responds(http_get, api_url):
    """Запрос к verify-password (POST) с пустыми данными — не 5xx."""
    # POST с заведомо несуществующей комнатой — должны получить 200/401/404, не 500
    import requests
    r = requests.post(
        f"{api_url}/api/claytablet/qa-rate-room/verify-password",
        json={"password": "x"},
        timeout=10,
    )
    assert r.status_code < 500, f"Server error {r.status_code}: {r.text}"
