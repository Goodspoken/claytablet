# Трек: Критические исправления по результатам аудита
**Статус:** ✅ Завершено
**Дата:** 2026-04-22
**Приоритет:** 🔴 Критический

## Описание
По итогам полного аудита кодовой базы PopyCast выявлены 5 критических проблем, требующих немедленного исправления: баги, уязвимости безопасности и архитектурные проблемы.

---

## Задачи

### 1. ✅ Баг: HTTPException(413) проглатывается → клиент получает 500
**Файл:** `backend/main.py` — `add_image()`, `add_audio()`

**Проблема:** `except Exception` перехватывает `HTTPException(413, "File too large")`, выброшенный внутри того же `try`-блока. Клиент получает `500 Failed to save file` вместо `413 File too large`.

**Решение:** Добавить `except HTTPException: raise` перед общим `except Exception`.

### 2. ✅ Баг: WebSocket держит DB session на всё время WS-соединения
**Файл:** `backend/main.py` — `websocket_endpoint()`

**Проблема:** `db: Session = Depends(database.get_db)` создаёт сессию, живущую столько же, сколько WebSocket (минуты/часы). Утечка ресурсов.

**Решение:** Создать локальную DB-сессию только для проверки пароля и сразу закрыть.

### 3. ✅ Безопасность: CORS wildcard `.*`
**Файл:** `backend/main.py` — `CORSMiddleware`

**Проблема:** `allow_origin_regex=".*"` разрешает запросы с любого домена. Опасно при наличии аутентификации.

**Решение:** Ограничить до конкретных доменов через переменную окружения `ALLOWED_ORIGINS`.

### 4. ✅ Безопасность: Отсутствие rate limiting (brute-force паролей)
**Файл:** `backend/main.py`

**Проблема:** Нет ограничений на количество попыток ввода пароля. Возможен brute-force.

**Решение:** Простой in-memory rate limiter для эндпоинта `verify-password` и `verify_room_access`.

### 5. ✅ Архитектура: Sync SQLAlchemy блокирует async event loop
**Файл:** `backend/main.py` — все async endpoints с `db: Session`

**Проблема:** Синхронные DB-вызовы внутри `async def` блокируют event loop.

**Решение:** Изменить endpoints на `def` (без async) — FastAPI автоматически запустит их в threadpool. Оставить `async def` только для WebSocket и чисто async-операций.

---

## Изменённые файлы
- `backend/main.py` — все 5 исправлений

