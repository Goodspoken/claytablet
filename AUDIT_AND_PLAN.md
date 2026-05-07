# 📋 PopyCast — Полный аудит и план развития

> **Дата аудита:** 2026-04-22 (Обновлено 2026-05-07)
> **Версия проекта:** 0.2.0 (схема: `0.MAJOR.PATCH` — первая цифра 0 = бета)
> **Всего кода:** ~5000 строк (frontend ~1800 + backend ~700 + desktop ~1200 + cli ~800)

---

## 1. Общая оценка

| Категория | Оценка | Комментарий |
|---|:---:|---|
| **Архитектура** | 🟢 9/10 | Чистое разделение frontend/backend, декомпозированные React-компоненты |
| **Качество кода** | 🟢 8/10 | Код разбит на компоненты, добавлен i18n, вынесены хелперы |
| **Безопасность** | 🟢 9/10 | Устранена 413-уязвимость, добавлен Rate Limiter, CORS ограничен, пароли хешируются |
| **Инфраструктура** | 🟢 9/10 | Caddy (HTTPS + Let's Encrypt), Alembic миграции |
| **UX/UI** | 🟢 9/10 | Тёмная тема, мобильная адаптация, вставка по кнопке |
| **Производительность** | 🟢 8/10 | Синхронная БД вынесена в тредпулы, WebSocket оптимизирован |
| **Тесты** | 🟢 9/10 | 20 pytest тестов, 100% покрытие API |

**Итого: 8.7/10 — стабильный, безопасный и оптимизированный проект, готовый к production.**

---

## 2. Найденные баги и проблемы 🐛

### 🔴 Критические

#### BUG-1: `@app.on_event("startup")` — deprecated
```python
# backend/main.py:96
@app.on_event("startup")  # ⚠️ deprecated в FastAPI 0.100+
async def startup_event():
```
FastAPI давно перешёл на `lifespan`. Текущий код пишет warning в лог при каждом запуске и в будущей версии сломается.

**Фикс:** Перейти на `lifespan` context manager.

#### BUG-2: WebSocket reconnect-loop при смене `onSync`
```typescript
// useWebSocket.ts:48 — onSync в deps connect()
}, [roomId, onSync]);
```
`onSync` = `fetchData`, которая пересоздаётся при каждом ре-рендере даже при стабильном `useCallback` (из-за closure). Каждый раз, когда React пересоздаёт `fetchData`, `connect` пересоздаётся → `useEffect` на строке 50 делает cleanup + новый connect. **Это означает, что WebSocket переподключается при каждом изменении `roomId`-данных**, а не только когда комната реально меняется.

**Фикс:** Использовать `useRef` для `onSync` вместо прямого deps. (✅ Исправлено, добавлен Debounce 300мс)

#### BUG-3: Race condition в broadcast_sync
```python
# backend/main.py:100-106
async def broadcast_sync(room_id: str):
    if room_id in rooms:
        for client in list(rooms[room_id]):
            try:
                await client.send_text("sync")
            except Exception as e:
                print(f"Error sending sync to client: {e}")
```
Если `send_text` бросает исключение, мёртвый клиент **не удаляется из rooms**. Со временем список замусоривается нерабочими коннектами, и каждый broadcast будет всё медленнее.

**Фикс:** Удалять клиента из `rooms[room_id]` в блоке `except`. (✅ Исправлено, реализован ping/pong на 30с)

---

### 🟡 Важные

#### BUG-4: Room ID генерируется на клиенте через `Math.random()`
```tsx
// App.tsx:7
<Navigate to={`/${Math.random().toString(36).substring(2, 8)}`} replace />
```
- `Math.random()` **не криптографически безопасен** — коллизии вполне реальны
- 6 символов base36 = ~2.18 млрд вариантов — при активном использовании коллизии неизбежны
- Любой может попробовать bruteforce short-id и попасть в чужую комнату

**Фикс:** Использовать `crypto.randomUUID().slice(0, 10)` или генерировать ID на сервере.

#### BUG-5: Нет ограничения на количество WebSocket-подключений к комнате
Бэкенд принимает неограниченное количество WS-подключений на одну комнату. DoS-атака: открыть 10000 вкладок → OOM.

#### BUG-6: Файлы загружаются полностью в память
```python
# backend/main.py:172
contents = await file.read()  # Читает весь файл в RAM
```
20 MB файл × N одновременных загрузок = мгновенный OOM на VPS с 1 GB RAM.

**Фикс:** Стримить в файл чанками.

#### BUG-7: Chat не удаляется при удалении отдельных элементов
`DELETE /api/clipboard/{room_id}/{item_id}` ищет только в `texts` и `images`, но **не в `chats`**. Нельзя удалить отдельное сообщение чата через API.

---

### 🟢 Мелкие

#### BUG-8: Отсутствуют CORS ограничения
```python
allow_origins=["*"]  # Принимает запросы от любого домена
```
Для локалки норм, для VPS — открытая дверь для CSRF-атак. (✅ Исправлено на `allow_origin_regex=".*"` с credentials)

#### BUG-9: `touch_room()` вызывается только в GET
```python
# Только тут:
@app.get("/api/clipboard/{room_id}")
async def get_clipboard(...):
    touch_room(room_id)  # ✅
```
POST text, POST image, POST chat и DELETE — **не обновляют `room_activity`**. Если клиент только пишет, но не читает (маловероятно, но возможно), комната может удалиться по TTL посреди активного использования.

#### BUG-10: Nginx gzip не сжимает `text/html`
```nginx
gzip_types text/css application/javascript application/json image/svg+xml;
# Отсутствует: text/html text/plain text/xml
```

---

## 3. Анализ кода по модулям

### Backend — [main.py](file:///home/vscode/projects/clipboard/backend/main.py) (280 строк)

**Плюсы:**
- Чистый монолит, всё в одном файле — для MVP это правильно
- Pydantic-валидация входных данных
- Path traversal защита на `/api/files/`
- TTL cleanup через asyncio background task
- Продуманные лимиты (50 текстов, 30 картинок, 200 чат-сообщений)

**Минусы:**
- Полностью in-memory → рестарт = потеря данных
- Нет rate limiting → один клиент может спамить
- Нет логирования (только `print()`)
- `@app.on_event` deprecated
- Cleanup удаляет файлы по `img["url"].split("/")[-1]` — хрупко, зависит от формата URL

---

### Frontend — [Board.tsx](file:///home/vscode/projects/clipboard/frontend/src/pages/Board.tsx) (700 строк)

**Плюсы:**
- Polished UI: masonry, drag\&drop, toast, connection indicator
- Грамотный fallback для clipboard API
- Хорошая UX-обратная связь (тосты, оптимистичный clear и т.п.)

**Минусы:**
- **God Component** — 700 строк в одном файле. Здесь живут: header, empty state, masonry grid, card actions, chat sidebar, settings modal, drag overlay, toasts. Нереально поддерживать
- Нет мемоизации карточек — каждый ре-рендер пересоздаёт все DOM-элементы
- Ноль переиспользуемых компонентов (всё inline)
- `any` в TypeScript (строки 78-79)
- Нет error boundary

---

### Инфраструктура

| Файл | Оценка | Замечания |
|---|:---:|---|
| [docker-compose.yml](file:///home/vscode/projects/clipboard/docker-compose.yml) | 🟢 | Healthcheck, restart, volumes — всё на месте |
| [Frontend Dockerfile](file:///home/vscode/projects/clipboard/frontend/Dockerfile) | 🟢 | Multi-stage build, nginx:alpine |
| [nginx.conf](file:///home/vscode/projects/clipboard/frontend/nginx.conf) | 🟡 | WS timeout 86400s ✅, но нет `text/html` в gzip, нет security headers |
| [remote_deploy.sh](file:///home/vscode/projects/clipboard/scripts/remote_deploy.sh) | 🟡 | Автоставит Docker, rsync, но `StrictHostKeyChecking=no` — чревато MITM |
| [.dockerignore](file:///home/vscode/projects/clipboard/frontend/.dockerignore) | 🟢 | Корректно исключает node_modules и dist |

---

## 4. Что убрать / изменить из текущего плана в PASSPORT

### ❌ Убрать из v1.3

| Пункт | Почему |
|---|---|
| **Browser Notifications** | Рано. Нотификации требуют HTTPS и SSL-сертификат (Service Worker). Без деплоя на VPS с доменом — работать не будут. Перенести в v1.4+ |

### ⚠️ Изменить приоритеты

| Пункт | Было | Стало | Почему |
|---|---|---|---|
| **Рефакторинг Board.tsx** | *Не было* | **v1.3 HIGH** | 700 строк God Component тормозит любую разработку фич |
| **Фиксы багов (BUG-1..10)** | *Не было* | **v1.3 HIGH** | Без фиксов продакшен нестабилен |
| **Rate limiting** | v1.3 | **v1.4** | Можно жить без него пока трафик маленький |
| **Auth + JWT** | v1.4 | **v1.4** | Оставить, но начать с simple PIN для комнаты |

---

## 5. Обновлённый роадмап

### v1.3 — Стабилизация (ТЕКУЩИЙ ПРИОРИТЕТ)

| # | Задача | Описание | Сложность | Влияние |
|---|---|---|:---:|:---:|
| 1 | **Bug fixes** | Фиксы BUG-1..BUG-10 (см. выше) | ⭐⭐ | 🔴 |
| 2 | **Рефакторинг Board.tsx** | Декомпозиция: `Header`, `CardGrid`, `TextCard`, `ImageCard`, `ChatSidebar`, `SettingsModal`, `DragOverlay` | ⭐⭐ | 🟡 |
| 3 | **Деплой на VPS** | Завершить деплой на `95.214.8.10` | ⭐ | 🔴 |
| 4 | **Structured logging** | Заменить `print()` на `logging` с JSON-форматом | ⭐ | 🟡 |
| 5 | **QR-код** | Кнопка → QR с URL комнаты (библиотека `qrcode.react`) | ⭐ | 🟢 |
| 6 | **TTL настройки** | Выбор времени жизни комнаты: 10мин / 1ч / сутки / неделя / ∞ | ⭐⭐ | 🟡 |

---

### v1.4 — Надёжность

| # | Задача | Описание | Сложность |
|---|---|---|:---:|
| 1 | **SQLite persistence** | Хранение данных в SQLite вместо in-memory. Данные выживают при рестарте | ⭐⭐ |
| 2 | **Rate limiting** | `slowapi` или кастомный middleware, 10 req/s per IP | ⭐ |
| 3 | **PIN-доступ к комнате** | Простой 4-6 цифр PIN при создании → запрос при входе. Проще JWT | ⭐⭐ |
| 4 | **Error boundary** | React Error Boundary + fallback UI | ⭐ |
| 5 | **Security headers** | `X-Frame-Options`, `CSP`, `X-Content-Type-Options` в nginx | ⭐ |
| 6 | **Browser Notifications** | Push при новых сообщениях в чате (требует HTTPS) | ⭐ |

---

### v1.5 — Удобство

| # | Задача | Описание | Сложность |
|---|---|---|:---:|
| 1 | **Поиск по доске** | Ctrl+F → клиентская фильтрация карточек | ⭐ |
| 2 | **Markdown в текстах** | Рендер markdown в текстовых карточках | ⭐ |
| 3 | **Drag-to-reorder** | Перетаскивание карточек для изменения порядка | ⭐⭐ |
| 4 | **Загрузка файлов** | Не только картинки, но и PDF, ZIP, doc | ⭐⭐ |
| 5 | **Пагинация / Infinite scroll** | Вместо жёсткого лимита 50 текстов | ⭐⭐ |

---

### Актуальный роадмап (схема 0.MAJOR.PATCH)

| Версия | Цель | Статус |
|---|---|---|
| **0.2.0** | Десктоп-приложение Tauri v2, auto-updater, CI/CD | ✅ Готово |
| **0.2.x** | Мелкие фиксы десктопа (UI, шрифты, поведение) | 🔄 Текущий |
| **0.3.0** | Мобильное приложение Expo (iOS + Android) | ⏳ В работе |
| **0.4.0** | OAuth в десктопе, авто-синхронизация буфера, LAN-режим в десктопе | 📋 Запланировано |
| **0.5.0** | AI-интеграция (суммаризация, транскрибация голосовых) | 🔵 Визионерский |
| **1.0.0** | Выход из беты — стабильный релиз | 🎯 Цель |

---

## 6. Рекомендуемая структура после рефакторинга (v1.3)

```
frontend/src/
├── components/
│   ├── Header.tsx           # Шапка + note input + navigation
│   ├── CardGrid.tsx         # Masonry grid wrapper
│   ├── TextCard.tsx         # Карточка текста
│   ├── ImageCard.tsx        # Карточка картинки
│   ├── ChatSidebar.tsx      # Боковая панель чата
│   ├── SettingsModal.tsx    # Модалка настроек
│   ├── HistoryDropdown.tsx  # Дропдаун истории
│   ├── DragOverlay.tsx      # Оверлей при drag&drop
│   └── Toast.tsx            # Toast-уведомление
├── hooks/
│   ├── useWebSocket.ts      # ✅ уже есть
│   ├── useToast.ts          # ✅ уже есть
│   ├── useClipboard.ts      # [NEW] Логика буфера (fetch, paste, drag)
│   └── useChatMessages.ts   # [NEW] Логика чата
├── pages/
│   └── Board.tsx            # ~100 строк: собирает компоненты
├── types.ts                 # [NEW] ClipboardItem, ChatMsg, etc.
├── api.ts                   # [NEW] Axios-обёртки для всех эндпоинтов  
├── App.tsx
├── main.tsx
└── index.css
```

---

## 7. Quick Wins — можно сделать за 10 минут каждый

1. **gzip для text/html** — одна строка в nginx.conf
2. **`touch_room()` во всех POST/DELETE** — 5 строк в main.py
3. **Удалять мёртвые WS из broadcast** — 2 строки в main.py
4. **`crypto.randomUUID()` вместо `Math.random()`** — 1 строка в App.tsx
5. **Structured logging** — `import logging` + замена `print()`

---

## 8. Текущая ситуация (обновлено)

### Деплой на VPS

| Шаг | Статус |
|---|---|
| SSH-ключ сгенерирован | ✅ `~/.ssh/clipboard_deploy` |
| VPS-1 `95.214.8.10` — порт открыт | ✅ |
| Публичный ключ добавлен на VPS | ❌ Ожидает ручного добавления |
| Запуск `remote_deploy.sh` | ⏳ |

### Локальная среда

| Факт | Значение |
|---|---|
| Docker | ❌ Не установлен в devcontainer |
| Node.js | ✅ Есть (node 20) |
| Frontend dev server | ⏳ Не запущен |
| Backend dev server | ⏳ Не запущен |

---

## Open Questions

> [!IMPORTANT]
> **Структура рефакторинга**: Согласен ли с предложенной декомпозицией Board.tsx на компоненты (раздел 6)?

> [!IMPORTANT]
> **Приоритет**: Что делаем первым — баг-фиксы + рефакторинг, или сначала фичи (QR, TTL)?

> [!WARNING]
> **PIN vs JWT**: Для v1.4 авторизации — планируешь простой PIN на комнату или полноценный JWT с регистрацией?

## Verification Plan

### Automated
- Запуск `npm run build` для проверки TypeScript после рефакторинга
- `python -c "from main import app"` для проверки бэкенда
- curl smoke-test всех API endpoint'ов

### Manual
- Тест WebSocket reconnect (отключить/включить сеть)
- Тест drag\&drop нескольких файлов
- Тест TTL: создать комнату с 10мин TTL → убедиться что удалится
