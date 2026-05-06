# План реализации: Реализация защиты комнат паролем

## Фаза 1: Бэкенд - Хранение и проверка паролей

- [x] Task: Проектирование API по чек-листу (`api-design-checklist.md`)
    - [x] Определить ресурсную модель и HTTP методы (POST для верификации)
    - [x] Выбрать корректные статус-коды (200, 401, 403, 422)
    - [x] Спроектировать единообразный формат ошибок
- [x] Task: Обновить Pydantic модели и хранилище
    - [x] Добавить `password_hash` в `room_configs`
    - [x] Обновить `RoomSettings` для передачи пароля
- [x] Task: Реализовать логику хеширования и проверки пароля
    - [x] Использовать `passlib` (bcrypt) для безопасного хеширования
    - [x] Создать эндпоинт `/api/clipboard/{room_id}/verify-password`
- [x] Task: Защита эндпоинтов (Security & Auth)
    - [x] Реализовать FastAPI Dependency для проверки `X-Room-Password`
    - [x] Применить зависимость к эндпоинтам чтения и записи
- [x] Task: Верификация Бэкенда
    - [x] Написать pytest тесты для всех сценариев (Checklist: Testing)
    - [x] Проверить отсутствие утечек паролей в логах и ответах
- [x] Task: Conductor - User Manual Verification 'Фаза 1: Бэкенд' (Protocol in workflow.md)

## Фаза 2: Фронтенд - Интерфейс и интеграция

- [x] Task: Обновить `SettingsModal`
    - [x] Добавить поля установки/смены пароля с валидацией
- [x] Task: Реализовать `PasswordPrompt` компонент
    - [x] Перехват 401 ошибок в API слое
    - [x] Сохранение сессионного пароля в памяти/state
- [x] Task: Интеграция WebSockets
    - [x] Передача пароля при инициализации WS соединения
    - [x] Обработка закрытия сокета при неверном пароле
- [x] Task: Ручное тестирование UI/UX
    - [x] Проверка визуальной обратной связи (лоадеры, ошибки)
    - [x] Проверка сохранения доступа при перезагрузке (если применимо)
- [x] Task: Conductor - User Manual Verification 'Фаза 2: Фронтенд' (Protocol in workflow.md)

## Фаза 3: Деплой и завершение (Ecosystem & Git Standards)

- [x] Task: Локальная проверка перед деплоем
    - [x] Запуск полного набора тестов `pytest`
    - [x] Проверка сборки Docker-образов: `docker compose build`
- [x] Task: Деплой на Serverbook (`ecosystem-guide.md`)
    - [x] Переключить контекст: `docker context use serverbook`
    - [x] Запустить обновление: `docker-compose up -d`
    - [x] Проверить логи: `docker-compose logs -f`
- [x] Task: Завершение ветки (`finishing-a-development-branch.md`)
    - [x] Выбор стратегии слияния (Merge locally / PR)
    - [x] Очистка временных ресурсов и веток
- [x] Task: Conductor - User Manual Verification 'Фаза 3: Деплой' (Protocol in workflow.md)