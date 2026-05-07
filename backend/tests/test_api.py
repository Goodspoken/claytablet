"""
Basic API tests for ClayTablet backend.
Run with: pytest tests/ -v
"""
import os
import shutil
import pytest

# DATA_DIR is set by conftest.py before this file is imported
TEST_DATA_DIR = os.environ["DATA_DIR"]

import sys  # noqa: E402
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Now import - database.py will use our TEST_DATA_DIR (set by conftest.py)
import database  # noqa: E402
import models  # noqa: E402
from main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="module")
def client():
    """Test client with clean test data dir."""
    # Dispose stale connections from module-level _init_database()
    database.engine.dispose()
    
    # Drop all existing tables and recreate for clean test state
    models.Base.metadata.drop_all(bind=database.engine)
    models.Base.metadata.create_all(bind=database.engine)
    
    os.makedirs(os.path.join(TEST_DATA_DIR, "media"), exist_ok=True)
    
    with TestClient(app) as c:
        yield c
    
    # Cleanup after tests
    database.engine.dispose()
    if os.path.exists(TEST_DATA_DIR):
        shutil.rmtree(TEST_DATA_DIR)



class TestHealthCheck:
    def test_health(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


class TestRoomOperations:
    ROOM = "test-room"

    def test_get_empty_room(self, client):
        r = client.get(f"/api/claytablet/{self.ROOM}")
        assert r.status_code == 200
        data = r.json()
        assert data["texts"] == []
        assert data["images"] == []
        assert data["audios"] == []
        assert data["chats"] == []

    def test_add_text(self, client):
        r = client.post(
            f"/api/claytablet/{self.ROOM}/text",
            json={"content": "Hello, PopyCast!"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["content"] == "Hello, PopyCast!"
        assert data["type"] == "text"
        assert "id" in data

    def test_get_room_with_text(self, client):
        r = client.get(f"/api/claytablet/{self.ROOM}")
        assert r.status_code == 200
        data = r.json()
        assert len(data["texts"]) >= 1
        assert data["texts"][0]["content"] == "Hello, PopyCast!"

    def test_add_chat_message(self, client):
        r = client.post(
            f"/api/claytablet/{self.ROOM}/chat",
            json={"author": "TestUser", "text": "Hello chat!"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["author"] == "TestUser"
        assert data["text"] == "Hello chat!"

    def test_delete_item(self, client):
        # Add an item, then delete it
        r = client.post(
            f"/api/claytablet/{self.ROOM}/text",
            json={"content": "Delete me"}
        )
        item_id = r.json()["id"]
        
        r = client.delete(f"/api/claytablet/{self.ROOM}/{item_id}")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_clear_all(self, client):
        r = client.delete(f"/api/claytablet/{self.ROOM}/all")
        assert r.status_code == 200
        
        r = client.get(f"/api/claytablet/{self.ROOM}")
        data = r.json()
        assert data["texts"] == []


class TestRoomSettings:
    ROOM = "settings-room"

    def test_get_default_settings(self, client):
        r = client.get(f"/api/claytablet/{self.ROOM}/settings")
        assert r.status_code == 200
        data = r.json()
        assert data["ttl"] == "24h"
        assert data["is_protected"] is False

    def test_update_ttl(self, client):
        r = client.post(
            f"/api/claytablet/{self.ROOM}/settings",
            json={"ttl": "7d"}
        )
        assert r.status_code == 200
        assert r.json()["ttl"] == "7d"

    def test_set_password(self, client):
        r = client.post(
            f"/api/claytablet/{self.ROOM}/settings",
            json={"ttl": "24h", "password": "secret123"}
        )
        assert r.status_code == 200
        assert r.json()["is_protected"] is True

    def test_verify_wrong_password(self, client):
        r = client.post(
            f"/api/claytablet/{self.ROOM}/verify-password",
            json={"password": "wrong"}
        )
        assert r.status_code == 401

    def test_verify_correct_password(self, client):
        r = client.post(
            f"/api/claytablet/{self.ROOM}/verify-password",
            json={"password": "secret123"}
        )
        assert r.status_code == 200

    def test_access_without_password(self, client):
        r = client.get(f"/api/claytablet/{self.ROOM}")
        assert r.status_code == 401

    def test_access_with_password(self, client):
        r = client.get(
            f"/api/claytablet/{self.ROOM}",
            headers={"X-Room-Password": "secret123"}
        )
        assert r.status_code == 200

    def test_remove_password(self, client):
        r = client.post(
            f"/api/claytablet/{self.ROOM}/settings",
            json={"ttl": "24h", "password": ""},
            headers={"X-Room-Password": "secret123"}
        )
        assert r.status_code == 200
        assert r.json()["is_protected"] is False


class TestImageUpload:
    ROOM = "upload-room"

    def test_upload_invalid_type(self, client):
        r = client.post(
            f"/api/claytablet/{self.ROOM}/image",
            files={"file": ("test.txt", b"not an image", "text/plain")}
        )
        assert r.status_code == 400

    def test_upload_image(self, client):
        # 1x1 red pixel PNG
        import struct
        import zlib
        
        def _make_png():
            sig = b'\x89PNG\r\n\x1a\n'
            ihdr_data = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
            ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
            ihdr = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc & 0xffffffff)
            raw = zlib.compress(b'\x00\xff\x00\x00')
            idat_crc = zlib.crc32(b'IDAT' + raw)
            idat = struct.pack('>I', len(raw)) + b'IDAT' + raw + struct.pack('>I', idat_crc & 0xffffffff)
            iend_crc = zlib.crc32(b'IEND')
            iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc & 0xffffffff)
            return sig + ihdr + idat + iend
        
        png = _make_png()
        r = client.post(
            f"/api/claytablet/{self.ROOM}/image",
            files={"file": ("test.png", png, "image/png")}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["type"] == "image"
        assert data["url"].startswith("/api/files/")


class TestValidation:
    def test_invalid_room_id(self, client):
        r = client.get("/api/claytablet/a")  # too short (min 2)
        assert r.status_code == 422

    def test_invalid_room_id_special_chars(self, client):
        r = client.get("/api/claytablet/room with spaces")
        assert r.status_code == 422


class TestRateLimiting:
    ROOM = "ratelimit-room"

    def test_rate_limit_triggers_after_5_attempts(self, client):
        import main as app_main
        # Clean up any state from previous runs for this room
        rate_key = f"testclient:{self.ROOM}"
        app_main._rate_limit_store.pop(rate_key, None)

        client.post(
            f"/api/claytablet/{self.ROOM}/settings",
            json={"ttl": "24h", "password": "test123"}
        )

        # First 5 wrong attempts should be 401 (not rate-limited yet)
        for i in range(5):
            r = client.post(
                f"/api/claytablet/{self.ROOM}/verify-password",
                json={"password": "wrong"}
            )
            assert r.status_code == 401, f"attempt {i+1} should be 401, got {r.status_code}"

        # 6th attempt should be 429
        r = client.post(
            f"/api/claytablet/{self.ROOM}/verify-password",
            json={"password": "wrong"}
        )
        assert r.status_code == 429

        # Even correct password is blocked during rate limit
        r = client.post(
            f"/api/claytablet/{self.ROOM}/verify-password",
            json={"password": "test123"}
        )
        assert r.status_code == 429


class TestPersonalRooms:
    """Тесты доступа к личным комнатам (owner_id установлен)."""
    ROOM = "personal-room"
    USER_ID = "google_test-user-123"

    def _create_user_and_token(self, client):
        """Создаём пользователя в БД напрямую и генерируем JWT."""
        import database
        import models
        import auth

        db = database.SessionLocal()
        try:
            user = db.query(models.User).filter(models.User.id == self.USER_ID).first()
            if not user:
                user = models.User(
                    id=self.USER_ID,
                    email="testuser@example.com",
                    name="Test User",
                    picture=None,
                    provider="google"
                )
                db.add(user)
                db.commit()
        finally:
            db.close()

        return auth.create_jwt_token(self.USER_ID)

    def _set_room_owner(self, room_id: str, owner_id: str):
        """Устанавливаем owner_id комнаты напрямую в БД."""
        import database
        import models

        db = database.SessionLocal()
        try:
            room = db.query(models.Room).filter(models.Room.id == room_id).first()
            if not room:
                room = models.Room(id=room_id, ttl="forever", owner_id=owner_id)
                db.add(room)
            else:
                room.owner_id = owner_id
            db.commit()
        finally:
            db.close()

    def test_personal_room_requires_auth(self, client):
        self._create_user_and_token(client)
        self._set_room_owner(self.ROOM, self.USER_ID)

        # Без авторизации → 403 (не 401!)
        r = client.get(f"/api/claytablet/{self.ROOM}")
        assert r.status_code == 403
        assert r.json()["detail"] == "auth_required"

    def test_personal_room_owner_access(self, client):
        token = self._create_user_and_token(client)
        self._set_room_owner(self.ROOM, self.USER_ID)

        # Владелец с JWT → 200
        r = client.get(
            f"/api/claytablet/{self.ROOM}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert r.status_code == 200

    def test_personal_room_wrong_user(self, client):
        import auth
        other_token = auth.create_jwt_token("google_other-user-999")
        self._set_room_owner(self.ROOM, self.USER_ID)

        # Другой пользователь → 403
        r = client.get(
            f"/api/claytablet/{self.ROOM}",
            headers={"Authorization": f"Bearer {other_token}"}
        )
        assert r.status_code == 403

    def test_verify_password_on_personal_room_returns_403(self, client):
        self._set_room_owner(self.ROOM, self.USER_ID)

        # verify-password для личной комнаты → 403 (не 401)
        r = client.post(
            f"/api/claytablet/{self.ROOM}/verify-password",
            json={"password": "anything"}
        )
        assert r.status_code == 403
        assert r.json()["detail"] == "auth_required"


class TestAuthEndpoints:
    """Тесты /api/auth/me."""

    def test_me_without_token(self, client):
        r = client.get("/api/auth/me")
        assert r.status_code == 401

    def test_me_with_invalid_token(self, client):
        r = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"}
        )
        assert r.status_code == 401

    def test_me_with_valid_token(self, client):
        import auth
        import database
        import models

        user_id = "google_auth-test-user"
        db = database.SessionLocal()
        try:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if not user:
                user = models.User(
                    id=user_id,
                    email="authtest@example.com",
                    name="Auth Test",
                    picture=None,
                    provider="google"
                )
                db.add(user)
                db.commit()
        finally:
            db.close()

        token = auth.create_jwt_token(user_id)
        r = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == user_id
        assert data["email"] == "authtest@example.com"
