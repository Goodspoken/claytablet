import os
import uuid
import time
import asyncio
import logging
from collections import defaultdict
from contextlib import asynccontextmanager
from pathlib import Path as FSPath
import sentry_sdk

from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, WebSocketDisconnect, Path, Header, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import bcrypt
from typing import Optional

# SQLAlchemy imports
from sqlalchemy.orm import Session
import database
import models

# Extracted modules
from constants import (
    ROOM_ID_REGEX, DEFAULT_ROOM_TTL_SECONDS, CLEANUP_INTERVAL_SECONDS,
    MAX_WS_PER_ROOM, MAX_TEXTS_PER_ROOM, MAX_IMAGES_PER_ROOM, MAX_AUDIO_PER_ROOM,
    MAX_FILES_PER_ROOM, MAX_CHATS_PER_ROOM, UPLOAD_CHUNK_SIZE,
    TTL_PRESETS, MEDIA_DIR,
    ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES,
    ALLOWED_AUDIO_EXTENSIONS, ALLOWED_AUDIO_MIME_TYPES,
    MAX_FILE_SIZE, BLOCKED_FILE_EXTENSIONS,
)
from schemas import TextItem, ChatItem, RoomSettings, OrderSettings, PasswordVerification
from system_rooms import SYSTEM_ROOMS, seed_system_rooms
from lan_qr import print_lan_qr

# --- Logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("claytablet")

# --- Initialize Database (via Alembic migrations, fallback to create_all) ---
def _init_database():
    """Ensure tables exist, then apply pending Alembic migrations on startup."""
    # First ensure all tables exist (safe, uses IF NOT EXISTS)
    models.Base.metadata.create_all(bind=database.engine)
    logger.info("Database initialized via create_all")
    
    try:
        from alembic.config import Config as AlembicConfig
        from alembic import command as alembic_command
        alembic_ini = os.path.join(os.path.dirname(__file__), "alembic.ini")
        if os.path.exists(alembic_ini):
            alembic_cfg = AlembicConfig(alembic_ini)
            alembic_cfg.set_main_option("sqlalchemy.url", database.SQLALCHEMY_DATABASE_URL)
            alembic_command.upgrade(alembic_cfg, "head")
            logger.info("Alembic migrations applied")
            return
    except Exception as e:
        logger.warning("Alembic migration failed: %s", e)

_init_database()

# --- Sentry (error tracking) ---
_sentry_dsn = os.getenv("SENTRY_DSN")
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        send_default_pii=False,  # FIX: don't leak cookies/IP to Sentry
        traces_sample_rate=0.1,
        environment=os.getenv("ENVIRONMENT", "production"),
    )
    logger.info("Sentry initialized")
else:
    logger.info("SENTRY_DSN not set, skipping Sentry init")


# --- DB Helpers ---
def _schedule_hook(hook_name: str, **kwargs) -> None:
    """Fire a plugin hook from any context (sync threadpool worker or async).

    The running event loop is captured in lifespan and stored on app.state.loop;
    sync callers reach it via run_coroutine_threadsafe. Async callers use
    create_task on the current loop.
    """
    loop = getattr(getattr(app, "state", None), "loop", None)
    if loop is None or not loop.is_running():
        return
    try:
        running = asyncio.get_running_loop()
        if running is loop:
            running.create_task(plugin_manager.fire(hook_name, **kwargs))
            return
    except RuntimeError:
        pass  # no running loop in this thread — fall through to threadsafe
    asyncio.run_coroutine_threadsafe(plugin_manager.fire(hook_name, **kwargs), loop)


def touch_room(db: Session, room_id: str, owner_id: str = None, is_public: bool = False):
    """Update last activity timestamp for a room. Creates it if it doesn't exist."""
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    is_new = room is None
    if not room:
        ttl = "forever" if owner_id else "24h"
        room = models.Room(id=room_id, last_activity=time.time(), owner_id=owner_id, ttl=ttl, is_public=is_public)
        db.add(room)
    else:
        room.last_activity = time.time()
    db.commit()
    db.refresh(room)
    if is_new:
        _schedule_hook("on_room_created", room_id=room_id)
    return room

def get_room_ttl(db: Session, room_id: str) -> int:
    """Get TTL for a room in seconds. Returns 0 for 'forever'."""
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    ttl_key = room.ttl if room else "24h"
    return TTL_PRESETS.get(ttl_key, DEFAULT_ROOM_TTL_SECONDS)

# --- WebSocket connections (Still in-memory because they are ephemeral TCP streams) ---
rooms: dict[str, list[WebSocket]] = {}

# --- TTL Cleanup ---
async def cleanup_stale_rooms():
    """Background task to remove rooms inactive for > their TTL, and purge rate limit store."""
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
        _cleanup_rate_limit_store()
        logger.info("Running stale room cleanup...")
        now = time.time()
        
        # We need our own DB session since this is a background infinite loop
        db: Session = database.SessionLocal()
        try:
            all_rooms = db.query(models.Room).all()
            stale_room_ids = []
            
            for room in all_rooms:
                if room.is_system:  # system rooms are permanent
                    continue
                ttl = get_room_ttl(db, room.id)
                if ttl == 0:  # "forever"
                    continue
                if now - room.last_activity > ttl:
                    stale_room_ids.append(room.id)
            
            for rid in stale_room_ids:
                room = db.query(models.Room).filter(models.Room.id == rid).first()
                if room:
                    # Clean up physical files before deleting from DB
                    for item in room.items:
                        if item.item_type in ["image", "audio", "file"] and item.url:
                            target_file = os.path.join(MEDIA_DIR, os.path.basename(item.url))
                            try:
                                os.remove(target_file)
                            except FileNotFoundError:
                                pass
                            except Exception as e:
                                logger.error(f"Failed to delete file {target_file}: {e}")
                    
                    db.delete(room)
                    logger.info("Cleaned up stale room: %s", rid)
            
            db.commit()
        except Exception as e:
            logger.error("Error during TTL cleanup: %s", e)
        finally:
            db.close()

# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Capture running loop so sync-context hooks (touch_room from threadpool) can schedule onto it
    app.state.loop = asyncio.get_running_loop()

    db = database.SessionLocal()
    try:
        seed_system_rooms(db)
    finally:
        db.close()

    # Load plugins before starting scheduler so all @scheduled jobs are registered
    plugins_dir = FSPath(os.path.dirname(__file__)).parent / "plugins"
    plugin_manager.load_plugins(plugins_dir)
    plugin_manager.start_scheduler()
    app.include_router(plugin_manager.get_fastapi_router())
    await plugin_manager.fire("on_startup")

    task = asyncio.create_task(cleanup_stale_rooms())
    logger.info("ClayTablet API started. SQLite DB attached. Cleanup task running every %ds.", CLEANUP_INTERVAL_SECONDS)
    print_lan_qr()
    yield
    task.cancel()
    await plugin_manager.fire("on_shutdown")
    plugin_manager.stop_scheduler()
    logger.info("ClayTablet API shutting down.")

app = FastAPI(title="ClayTablet API", lifespan=lifespan)

# --- CORS: restrict origins (configurable via env) ---
_cors_origins_raw = os.getenv("ALLOWED_ORIGINS", "https://claytablet.online,https://claytablet.online,http://localhost:5173,http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Rate Limiter (in-memory, per-IP+room) ---
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 300  # 5 minutes
RATE_LIMIT_MAX_ATTEMPTS = 5  # max attempts per window per key

def check_rate_limit(key: str) -> bool:
    """Returns True if request is allowed, False if rate-limited. key = ip:room_id"""
    now = time.time()
    _rate_limit_store[key] = [t for t in _rate_limit_store[key] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limit_store[key]) >= RATE_LIMIT_MAX_ATTEMPTS:
        return False
    _rate_limit_store[key].append(now)
    return True

def _cleanup_rate_limit_store():
    """Remove expired entries to prevent unbounded memory growth."""
    now = time.time()
    stale_keys = [k for k, ts in _rate_limit_store.items() if not any(now - t < RATE_LIMIT_WINDOW for t in ts)]
    for k in stale_keys:
        del _rate_limit_store[k]

# --- Broadcast helper ---
async def broadcast_sync(room_id: str):
    """Send 'sync' to all WS clients in a room. Remove dead connections."""
    if room_id not in rooms:
        return
    dead_clients = []
    for client in list(rooms[room_id]):
        try:
            await client.send_text("sync")
        except Exception:
            dead_clients.append(client)
    for client in dead_clients:
        if client in rooms.get(room_id, []):
            rooms[room_id].remove(client)
            logger.warning("Removed dead WebSocket from room %s", room_id)
    if not rooms.get(room_id):
        rooms.pop(room_id, None)

# --- Auth Dependency ---
from auth import router as auth_router, get_current_user_id_sync  # noqa: E402
from plugin_manager import PluginManager  # noqa: E402

plugin_manager = PluginManager()

app.include_router(auth_router)

def _check_room_access(room: Optional["models.Room"], token: Optional[str], password: Optional[str]) -> Optional[str]:
    """Core access check shared by HTTP and WebSocket paths.

    Returns the authenticated user_id (or None for anonymous public access).
    Raises HTTPException(401|403) on access denial.
    """
    user_id = get_current_user_id_sync(token) if token else None
    if room is None:
        return user_id  # missing rooms are touch_room'd by callers — no auth needed

    # Personal room: only the owner (authenticated via JWT) can access
    if room.owner_id:
        if user_id != room.owner_id:
            raise HTTPException(status_code=403, detail="auth_required")
        return user_id

    # Password-protected room: bcrypt-check the supplied password
    if room.password_hash:
        if not password:
            raise HTTPException(status_code=401, detail="password_required")
        try:
            ok = bcrypt.checkpw(password.encode('utf-8'), room.password_hash.encode('utf-8'))
        except ValueError:
            ok = False
        if not ok:
            raise HTTPException(status_code=401, detail="password_required")

    return user_id


def _extract_bearer_token(request: Request) -> Optional[str]:
    token = request.cookies.get("claytablet_token")
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    return token


def verify_room_access(
    request: Request,
    room_id: str = Path(..., pattern=ROOM_ID_REGEX),
    x_room_password: Optional[str] = Header(None),
    password: Optional[str] = Query(None),
    db: Session = Depends(database.get_db)
):
    token = _extract_bearer_token(request)
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    return _check_room_access(room, token, x_room_password or password)


def verify_room_access_sync(room_id: str, x_room_password: Optional[str], password: Optional[str], db: Session, token: Optional[str] = None):
    """Synchronous version for WebSocket endpoint which can't easily use Depends under manual flow."""
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    _check_room_access(room, token, x_room_password or password)
    return True

def verify_write_access(
    room_id: str = Path(..., pattern=ROOM_ID_REGEX),
    db: Session = Depends(database.get_db),
    user_id: Optional[str] = Depends(verify_room_access)
):
    """Raises 403 if room is read-only and current user is not the owner."""
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if room and room.is_readonly and user_id != room.owner_id:
        raise HTTPException(status_code=403, detail="readonly")
    return user_id

def verify_chat_access(
    room_id: str = Path(..., pattern=ROOM_ID_REGEX),
    db: Session = Depends(database.get_db),
    user_id: Optional[str] = Depends(verify_room_access)
):
    """Like verify_write_access, but also allows chat in public read-only rooms (e.g. system rooms)."""
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if room and room.is_readonly and user_id != room.owner_id:
        # Allow chat when the readonly room is publicly visible — comments under system/public boards
        if not room.is_public:
            raise HTTPException(status_code=403, detail="readonly")
    return user_id

# --- Health ---
@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok"}

# --- Config (exposes server limits to frontend) ---
@app.get("/api/config")
async def get_config():
    """Returns server configuration so the frontend can adapt its UI dynamically."""
    return {
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "max_file_size_bytes": MAX_FILE_SIZE,
        "allowed_image_extensions": sorted(ALLOWED_EXTENSIONS),
        "allowed_audio_extensions": sorted(ALLOWED_AUDIO_EXTENSIONS),
        "ttl_presets": list(TTL_PRESETS.keys()),
        "limits": {
            "max_texts_per_room": MAX_TEXTS_PER_ROOM,
            "max_images_per_room": MAX_IMAGES_PER_ROOM,
            "max_audio_per_room": MAX_AUDIO_PER_ROOM,
            "max_files_per_room": MAX_FILES_PER_ROOM,
            "max_chat_messages_per_room": MAX_CHATS_PER_ROOM,
            "max_ws_connections_per_room": MAX_WS_PER_ROOM,
        }
    }

# --- Room settings ---
# FIX #5: Use sync `def` so FastAPI runs these in a threadpool,
# avoiding blocking the async event loop with synchronous SQLAlchemy calls.
def _room_settings_dict(room, user_id: Optional[str]) -> dict:
    return {
        "ttl": room.ttl,
        "is_protected": bool(room.password_hash),
        "is_readonly": bool(room.is_readonly),
        "is_public": bool(room.is_public),
        "is_system": bool(room.is_system),
        "is_owner": room.owner_id is not None and user_id == room.owner_id,
    }

@app.get("/api/claytablet/{room_id}/settings")
def get_settings(
    room_id: str = Path(..., pattern=ROOM_ID_REGEX),
    db: Session = Depends(database.get_db),
    user_id: Optional[str] = Depends(verify_room_access)
):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        return {"ttl": "24h", "is_protected": False, "is_readonly": False, "is_owner": False}
    return _room_settings_dict(room, user_id)

@app.post("/api/claytablet/{room_id}/settings")
async def update_settings(
    settings: RoomSettings,
    room_id: str = Path(..., pattern=ROOM_ID_REGEX),
    db: Session = Depends(database.get_db),
    user_id: Optional[str] = Depends(verify_write_access)  # FIX #9: guests can't change settings in readonly mode
):
    room = touch_room(db, room_id, owner_id=user_id)
    room.ttl = settings.ttl
    room.is_readonly = settings.is_readonly
    if not room.is_system:
        room.is_public = settings.is_public

    if settings.password is not None:
        if settings.password == "":
            room.password_hash = None
        else:
            salt = bcrypt.gensalt()
            room.password_hash = bcrypt.hashpw(settings.password.encode('utf-8'), salt).decode('utf-8')

    db.commit()
    logger.info("Room %s settings updated: ttl=%s, has_password=%s, is_readonly=%s", room_id, room.ttl, bool(room.password_hash), room.is_readonly)
    await broadcast_sync(room_id)
    return _room_settings_dict(room, user_id)

@app.get("/api/claytablet/rooms/public")
def list_public_rooms(db: Session = Depends(database.get_db)):
    """List public, non-system rooms ordered by recent activity."""
    rooms = (
        db.query(models.Room)
        .filter(models.Room.is_public, ~models.Room.is_system)
        .order_by(models.Room.last_activity.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": r.id,
            "is_protected": bool(r.password_hash),
            "last_activity": r.last_activity,
        }
        for r in rooms
    ]

@app.get("/api/claytablet/rooms/system")
def list_system_rooms():
    """Return the list of built-in system rooms with metadata."""
    return SYSTEM_ROOMS

@app.post("/api/claytablet/{room_id}/order")
async def update_order(
    settings: OrderSettings,
    room_id: str = Path(..., pattern=ROOM_ID_REGEX), 
    db: Session = Depends(database.get_db),
    user_id: Optional[str] = Depends(verify_room_access)
):
    room = touch_room(db, room_id, owner_id=user_id)
    room.layout_order = settings.order
    db.commit()
    await broadcast_sync(room_id)
    return {"status": "ok"}


@app.post("/api/claytablet/{room_id}/verify-password")
def verify_password(
    payload: PasswordVerification,
    room_id: str = Path(..., pattern=ROOM_ID_REGEX),
    request: Request = None,
    db: Session = Depends(database.get_db)
):
    client_ip = request.client.host if request and request.client else "unknown"
    rate_key = f"{client_ip}:{room_id}"
    if not check_rate_limit(rate_key):
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")

    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        return {"status": "ok"}
    # Personal room — password prompt doesn't apply, need OAuth login
    if room.owner_id:
        raise HTTPException(status_code=403, detail="auth_required")
    if not room.password_hash:
        return {"status": "ok"}
    try:
        if not bcrypt.checkpw(payload.password.encode('utf-8'), room.password_hash.encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid password")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid password")
    return {"status": "ok"}

# --- WebSocket ---
@app.websocket("/api/ws/rooms/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    room_id: str,
):
    # FIX #2: Create a short-lived DB session for auth only, don't keep it for the WS lifetime
    password = websocket.query_params.get("password")
    token = websocket.cookies.get("claytablet_token")
    # CLI и другие клиенты передают токен через query param или Authorization header
    if not token:
        token = websocket.query_params.get("token")
    if not token:
        auth_header = websocket.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    db: Session = database.SessionLocal()
    try:
        verify_room_access_sync(room_id=room_id, x_room_password=None, password=password, db=db, token=token)
    except HTTPException:
        await websocket.close(code=1008, reason="Unauthorized")
        logger.warning("Rejected WS connection to room %s: unauthorized", room_id)
        return
    finally:
        db.close()

    if room_id in rooms and len(rooms[room_id]) >= MAX_WS_PER_ROOM:
        await websocket.close(code=1008, reason="Room connection limit reached")
        logger.warning("Rejected WS connection to room %s: limit %d reached", room_id, MAX_WS_PER_ROOM)
        return

    await websocket.accept()
    if room_id not in rooms:
        rooms[room_id] = []
    rooms[room_id].append(websocket)
    logger.info("Client joined room: %s. Total clients: %d", room_id, len(rooms[room_id]))

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                continue

            dead_clients = []
            for client in list(rooms.get(room_id, [])):
                if client != websocket:
                    try:
                        await client.send_text(data)
                    except Exception:
                        dead_clients.append(client)
            for client in dead_clients:
                if client in rooms.get(room_id, []):
                    rooms[room_id].remove(client)
    except WebSocketDisconnect:
        if websocket in rooms.get(room_id, []):
            rooms[room_id].remove(websocket)
        logger.info("Client left room: %s. Total clients: %d", room_id, len(rooms.get(room_id, [])))
        if not rooms.get(room_id):
            rooms.pop(room_id, None)

# ---- Read ----
def item_to_dict(item: models.Item):
    """Serialize SQLAlchemy Item into dict matching frontend expectations"""
    res = {
        "id": item.id,
        "timestamp": item.timestamp,
        "type": item.item_type
    }
    if item.item_type == "text":
        res["content"] = item.content
    elif item.item_type in ["image", "audio", "file"]:
        res["filename"] = item.filename
        res["url"] = item.url
        if item.file_size is not None:
            res["size"] = item.file_size
    elif item.item_type == "chat":
        res["author"] = item.author
        res["text"] = item.text
    return res

@app.get("/api/claytablet/{room_id}")
def get_clipboard(
    room_id: str = Path(..., pattern=ROOM_ID_REGEX), 
    db: Session = Depends(database.get_db),
    user_id: Optional[str] = Depends(verify_room_access)
):
    room = touch_room(db, room_id, owner_id=user_id)
    
    # Needs chronological ordering natively matching logic
    all_items = db.query(models.Item).filter(models.Item.room_id == room_id).order_by(models.Item.timestamp.desc()).all()
    
    texts = [item_to_dict(i) for i in all_items if i.item_type == "text"]
    images = [item_to_dict(i) for i in all_items if i.item_type == "image"]
    audios = [item_to_dict(i) for i in all_items if i.item_type == "audio"]
    files = [item_to_dict(i) for i in all_items if i.item_type == "file"]
    
    # Chats are ordered chronologically (oldest to newest)
    chats_db = db.query(models.Item).filter(models.Item.room_id == room_id, models.Item.item_type == "chat").order_by(models.Item.timestamp.asc()).all()
    chats = [item_to_dict(i) for i in chats_db]

    return {
        "texts": texts,
        "images": images,
        "audios": audios,
        "files": files,
        "chats": chats,
        "settings": _room_settings_dict(room, user_id),
        "layout_order": room.layout_order or [],
    }

# ---- Create ----
@app.post("/api/claytablet/{room_id}/text")
async def add_text(
    item: TextItem,
    room_id: str = Path(..., pattern=ROOM_ID_REGEX),
    db: Session = Depends(database.get_db),
    user_id: Optional[str] = Depends(verify_write_access)
):
    touch_room(db, room_id, owner_id=user_id)
    
    # Text count limit constraint (Max 50)
    text_count = db.query(models.Item).filter(models.Item.room_id == room_id, models.Item.item_type == "text").count()
    if text_count >= MAX_TEXTS_PER_ROOM:
        # Delete oldest
        oldest_text = db.query(models.Item).filter(models.Item.room_id == room_id, models.Item.item_type == "text").order_by(models.Item.timestamp.asc()).first()
        if oldest_text:
            db.delete(oldest_text)

    new_item = models.Item(
        id=str(uuid.uuid4()),
        room_id=room_id,
        item_type="text",
        content=item.content,
        timestamp=time.time()
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    await broadcast_sync(room_id)
    await plugin_manager.fire("on_text_added", room_id=room_id, content=item.content, item_id=new_item.id)
    return item_to_dict(new_item)

# --- Shared upload helper (eliminates image/audio duplication) ---
async def _upload_media(
    room_id: str,
    file: UploadFile,
    db: Session,
    item_type: str,
    allowed_extensions: Optional[set[str]],
    allowed_mime_types: Optional[set[str]],
    max_items: int = 30,
) -> dict:
    """Shared logic for uploading image, audio, or general files."""
    # Note: touch_room is called by the endpoint before this
    ext = os.path.splitext(file.filename or "")[1].lower()
    
    # Check blocklist first
    if ext in BLOCKED_FILE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension '{ext}' is blocked for security reasons")

    if allowed_extensions is not None and ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed")

    base_mime = file.content_type.split(';')[0].strip() if file.content_type else None
    if allowed_mime_types is not None and base_mime and base_mime not in allowed_mime_types:
        raise HTTPException(status_code=400, detail=f"MIME type '{file.content_type}' not allowed")

    file_id = str(uuid.uuid4())
    filename = f"{file_id}{ext}"
    file_path = os.path.join(MEDIA_DIR, filename)

    total_size = 0
    try:
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(UPLOAD_CHUNK_SIZE)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > MAX_FILE_SIZE:
                    buffer.close()
                    os.remove(file_path)
                    raise HTTPException(status_code=413, detail="File too large (max 50 MB)")
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to save file")

    # Evict oldest item if over limit
    item_count = db.query(models.Item).filter(
        models.Item.room_id == room_id, models.Item.item_type == item_type
    ).count()
    if item_count >= max_items:
        oldest = db.query(models.Item).filter(
            models.Item.room_id == room_id, models.Item.item_type == item_type
        ).order_by(models.Item.timestamp.asc()).first()
        if oldest:
            old_path = os.path.join(MEDIA_DIR, os.path.basename(oldest.url))
            if os.path.exists(old_path):
                os.remove(old_path)
            db.delete(oldest)

    new_item = models.Item(
        id=file_id,
        room_id=room_id,
        item_type=item_type,
        filename=file.filename,
        url=f"/api/files/{filename}",
        file_size=total_size,  # FIX #4: save size for image/audio too
        timestamp=time.time()
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    await broadcast_sync(room_id)
    if item_type == "image":
        await plugin_manager.fire("on_image_added", room_id=room_id, filename=new_item.filename, item_id=new_item.id)
    return item_to_dict(new_item)


@app.post("/api/claytablet/{room_id}/image")
async def add_image(
    room_id: str = Path(..., pattern=ROOM_ID_REGEX), 
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    user_id: Optional[str] = Depends(verify_write_access)
):
    touch_room(db, room_id, owner_id=user_id)
    return await _upload_media(room_id, file, db, "image", ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES)

@app.post("/api/claytablet/{room_id}/audio")
async def add_audio(
    room_id: str = Path(..., pattern=ROOM_ID_REGEX),
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    user_id: Optional[str] = Depends(verify_write_access)
):
    touch_room(db, room_id, owner_id=user_id)
    return await _upload_media(room_id, file, db, "audio", ALLOWED_AUDIO_EXTENSIONS, ALLOWED_AUDIO_MIME_TYPES)

@app.post("/api/claytablet/{room_id}/file")
async def add_file(
    room_id: str = Path(..., pattern=ROOM_ID_REGEX),
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    user_id: Optional[str] = Depends(verify_write_access)
):
    """Upload any file type (universal endpoint)."""
    touch_room(db, room_id, owner_id=user_id)
    return await _upload_media(room_id, file, db, "file", None, None, max_items=MAX_FILES_PER_ROOM)

@app.post("/api/claytablet/{room_id}/chat")
async def add_chat(
    item: ChatItem,
    room_id: str = Path(..., pattern=ROOM_ID_REGEX),
    db: Session = Depends(database.get_db),
    user_id: Optional[str] = Depends(verify_chat_access)
):
    touch_room(db, room_id, owner_id=user_id)
    
    # Chat count limit
    chat_count = db.query(models.Item).filter(models.Item.room_id == room_id, models.Item.item_type == "chat").count()
    if chat_count >= MAX_CHATS_PER_ROOM:
        oldest_chat = db.query(models.Item).filter(models.Item.room_id == room_id, models.Item.item_type == "chat").order_by(models.Item.timestamp.asc()).first()
        if oldest_chat:
            db.delete(oldest_chat)

    new_item = models.Item(
        id=str(uuid.uuid4()),
        room_id=room_id,
        item_type="chat",
        author=item.author,
        text=item.text,
        timestamp=time.time()
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    await broadcast_sync(room_id)
    return item_to_dict(new_item)

# ---- Delete ----
@app.delete("/api/claytablet/{room_id}/all")
async def clear_all(
    room_id: str = Path(..., pattern=ROOM_ID_REGEX),
    db: Session = Depends(database.get_db),
    user_id: Optional[str] = Depends(verify_write_access)
):
    """Clear all items from the clipboard."""
    room = touch_room(db, room_id, owner_id=user_id)
    
    for item in list(room.items):
        if item.item_type in ["image", "audio", "file"] and item.url:
            target_file = os.path.join(MEDIA_DIR, os.path.basename(item.url))
            try:
                os.remove(target_file)
            except FileNotFoundError:
                pass
        db.delete(item)
    
    db.commit()
    await broadcast_sync(room_id)
    return {"status": "ok"}

@app.delete("/api/claytablet/{room_id}/{item_id}")
async def delete_item(
    room_id: str = Path(..., pattern=ROOM_ID_REGEX),
    item_id: str = Path(...),
    db: Session = Depends(database.get_db),
    _ = Depends(verify_write_access)
):
    """Delete a single item by its ID (text, image, audio, or chat message)."""
    touch_room(db, room_id)

    item = db.query(models.Item).filter(models.Item.id == item_id, models.Item.room_id == room_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.item_type in ["image", "audio", "file"] and item.url:
        target_file = os.path.join(MEDIA_DIR, os.path.basename(item.url))
        try:
            os.remove(target_file)
        except FileNotFoundError:
            pass
            
    db.delete(item)
    db.commit()

    await broadcast_sync(room_id)
    await plugin_manager.fire("on_item_deleted", room_id=room_id, item_id=item_id)
    return {"status": "ok"}

# ---- Serve images ----
@app.get("/api/files/{filename}")
async def get_image(filename: str):
    safe_name = os.path.basename(filename)
    if safe_name != filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = os.path.join(MEDIA_DIR, safe_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
