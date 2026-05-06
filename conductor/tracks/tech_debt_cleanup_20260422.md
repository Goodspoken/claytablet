# Трек: Технический долг — очистка и стабилизация
**Статус:** ✅ Завершено
**Дата:** 2026-04-22
**Приоритет:** 🟡 Средний

## Задачи

- [x] **1. Hardcoded строки → i18n** — BottomInputBar, CanvasModal, CardGrid, ChatSidebar, QRModal, DragOverlay, TextCard, ImageCard, AudioCard
- [x] **2. Дубликат image/audio upload** — выделена `_upload_media()` (~130 строк → 1 helper + 2 slim wrappers)
- [x] **3. `IMAGES_DIR` → `MEDIA_DIR`** — переименовано во всём backend (10 вхождений)
- [x] **4. `utils.tsx` → split** — pure-функции вынесены в `utils.ts`, JSX (`linkify`) остался в `utils.tsx`
- [x] **5. Базовые тесты backend** — pytest, 20 тестов: health, CRUD, settings, password, uploads, validation, rate limiting
- [x] **6. Alembic миграции** — настроена инфраструктура, initial migration, auto-migrate при старте + fallback
- [x] **7. Удалить `nginx.conf`** — удалён

## Изменённые файлы

### Backend
- `backend/main.py` — MEDIA_DIR, _upload_media(), Alembic init, rate limiter
- `backend/requirements.txt` — +alembic
- `backend/alembic/` — новая директория с env.py и initial migration
- `backend/tests/test_api.py` — новый файл с 20 тестами

### Frontend
- `frontend/src/i18n.ts` — +30 новых ключей (RU + EN)
- `frontend/src/utils.ts` — новый файл (pure functions)
- `frontend/src/utils.tsx` — теперь только linkify + re-exports
- `frontend/src/components/BottomInputBar.tsx` — t() вместо hardcoded
- `frontend/src/components/CanvasModal.tsx` — t() вместо hardcoded
- `frontend/src/components/CardGrid.tsx` — t() вместо hardcoded
- `frontend/src/components/ChatSidebar.tsx` — t() вместо hardcoded
- `frontend/src/components/QRModal.tsx` — t() вместо hardcoded
- `frontend/src/components/DragOverlay.tsx` — t() вместо hardcoded
- `frontend/src/components/TextCard.tsx` — t() вместо hardcoded
- `frontend/src/components/ImageCard.tsx` — t() вместо hardcoded
- `frontend/src/components/AudioCard.tsx` — t() вместо hardcoded
- `frontend/nginx.conf` — удалён (мусор)
