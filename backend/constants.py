"""Constants shared across the DubTab backend."""
import os

ROOM_ID_REGEX = r"^[a-zA-Z0-9_-]{2,32}$"
DEFAULT_ROOM_TTL_SECONDS = 24 * 60 * 60  # 24 hours
CLEANUP_INTERVAL_SECONDS = 5 * 60        # 5 minutes
MAX_WS_PER_ROOM = 50
MAX_TEXTS_PER_ROOM = 50
MAX_IMAGES_PER_ROOM = 30
MAX_AUDIO_PER_ROOM = 30
MAX_FILES_PER_ROOM = 30
MAX_CHATS_PER_ROOM = 200
UPLOAD_CHUNK_SIZE = 64 * 1024  # streaming chunk size for uploads

TTL_PRESETS = {
    "10m": 10 * 60,
    "1h": 60 * 60,
    "24h": 24 * 60 * 60,
    "7d": 7 * 24 * 60 * 60,
    "forever": 0,
}

DATA_DIR = os.getenv("DATA_DIR", "/app/data")
MEDIA_DIR = os.path.join(DATA_DIR, "media")
os.makedirs(MEDIA_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif",
    "image/webp", "image/bmp",
}
ALLOWED_AUDIO_EXTENSIONS = {".webm", ".mp4", ".m4a", ".mp3", ".ogg", ".wav"}
ALLOWED_AUDIO_MIME_TYPES = {
    "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "video/webm"
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
BLOCKED_FILE_EXTENSIONS = {
    ".php", ".py", ".sh", ".exe", ".bat", ".cmd",
    ".html", ".htm", ".js", ".jsp", ".asp", ".aspx", ".cgi",
}
