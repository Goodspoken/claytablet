# Трек: Фикс тестов + Первый деплой на claytablet.online

**Дата:** 2026-04-26
**Статус:** ✅ Завершён (ожидание DNS пропагации)
**Приоритет:** 🔴 Критический

---

## Цель

Восстановить работоспособность проекта после пересоздания devcontainer, починить тесты, и задеплоить на VPS с доменом claytablet.online.

---

## Что было сделано

### 1. Диагностика окружения

После пересоздания devcontainer контейнер был чистый — ни Node.js, ни Python-пакетов. Проведена диагностика:
- Node.js отсутствовал → установлен `nodejs 20.x` через nodesource
- Python-пакеты отсутствовали → установлены через `pip install -r requirements.txt`
- TypeScript проверка (`tsc --noEmit`) — ✅ ноль ошибок
- Vite build (`npm run build`) — ✅ успешно
- Backend import — ✅ OK (с правильным `DATA_DIR`)
- Alembic миграции — ✅ 3 миграции применились автоматически

### 2. Фикс тестов (15/20 → 20/20)

**Причина ошибки:** `_init_database()` в `main.py` вызывается при импорте модуля и создаёт SQLAlchemy engine с открытыми соединениями в pool. Тестовая фикстура делала `shutil.rmtree` директории с БД-файлом, а затем пыталась писать через уже открытый engine — получалась ошибка `sqlite3.OperationalError: attempt to write a readonly database`.

**Решение:**
- Создан `backend/tests/conftest.py` — устанавливает `DATA_DIR` и создаёт директорию **до** любых импортов (pytest загружает conftest первым)
- В `test_api.py`: добавлен `database.engine.dispose()` для сброса pool соединений, заменён `create_all` на `drop_all + create_all` для чистого состояния
- Удалено дублирование установки `DATA_DIR` из `test_api.py` (теперь только в `conftest.py`)

**Результат:** `20/20 passed in 10.40s`

### 3. Фикс небезопасной генерации Room ID

**Причина:** `HomePage.tsx` содержал локальную функцию `generateId()` использующую `Math.random()` вместо безопасной версии из `helpers.ts` (`crypto.randomUUID()`).

**Решение:** Удалена локальная функция, добавлен импорт `import { generateId } from '../helpers'`.

### 4. Проверка инфраструктуры

| Компонент | Статус | Детали |
|---|---|---|
| Serverbook (`illz@192.168.1.2`) | ✅ Доступен | SSH работает |
| VPS (`admin@109.120.134.188 -p 2202`) | ✅ Доступен | Через Serverbook с ключом `~/.ssh/id_rsa_aeza` |
| DNS `claytablet.online` | ❌ Неверный | `37.140.192.116` (парковка) вместо `109.120.134.188` |
| DNS `claytablet.ru` | ❌ Неверный | `37.140.192.116` (парковка) вместо `109.120.134.188` |

**Важно:** SSH-ключ для VPS с Serverbook — `~/.ssh/id_rsa_aeza` (не `id_ed25519`). Обновлён `deploy_vps_prompt.md`.

### 5. Деплой на VPS

**Путь деплоя:** devcontainer → rsync → Serverbook → rsync → VPS

Проект на Serverbook находится в `/srv/storage/Projects/claytablet/` (не `popycast/`).

Шаги:
1. Создан `/opt/clipboard` на VPS (`sudo mkdir -p && sudo chown admin:admin`)
2. rsync: devcontainer → Serverbook (`/srv/storage/Projects/claytablet/`)
3. rsync: Serverbook → VPS (`/opt/clipboard/`) через `id_rsa_aeza`
4. `sudo docker compose up -d --build` — образы собраны, контейнеры запущены

**Статус контейнеров:**
```
NAME                  IMAGE                STATUS
claytablet-backend    clipboard-backend    Up (healthy)   0.0.0.0:8555->8000/tcp
claytablet-frontend   clipboard-frontend   Up             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

**Backend health check:** `curl http://localhost:8555/api/health` → `{"status":"ok"}` ✅

**Caddy/SSL:** Ошибка получения сертификата — `HTTP 403 unauthorized` от Let's Encrypt. Причина: DNS ещё не обновлён. Caddy автоматически ретраит каждые 60 секунд.

---

## Что ожидает пользователя

- [ ] Исправить A-запись `claytablet.online` → `109.120.134.188` в панели регистратора
- [ ] Исправить A-запись `claytablet.ru` → `109.120.134.188` в панели регистратора
- [ ] Подождать 5-30 мин для DNS пропагации
- [ ] Caddy автоматически получит SSL, сайт станет доступен по HTTPS

---

## Файлы изменены

| Файл | Тип изменения |
|---|---|
| `backend/tests/conftest.py` | Создан — настройка тестовой среды до импортов |
| `backend/tests/test_api.py` | Исправлен — `engine.dispose()`, `drop_all+create_all`, убрано дублирование DATA_DIR |
| `frontend/src/pages/HomePage.tsx` | Исправлен — убрана локальная `Math.random()` генерация ID |
| `conductor/deploy_vps_prompt.md` | Обновлён — правильный SSH ключ, домен, версия |
| `conductor/user_to_do.md` | Создан — список задач пользователя с рекомендациями по домену |
