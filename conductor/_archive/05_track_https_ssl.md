# HTTPS + Голосовой ввод (2026-04-19)

## Выполнено:

- **Self-Signed SSL:**
  - В `frontend/Dockerfile` добавлена генерация SSL-сертификата через `openssl` при сборке образа
  - `frontend/nginx.conf` переписан: HTTPS на порту 443 + редирект HTTP→HTTPS
  - `docker-compose.yml`: маппинг `8505:443`

- **Фикс MIME-валидации аудио:**
  - Браузеры отправляют `audio/webm;codecs=opus` — бэкенд падал на валидации
  - Добавлена обрезка codec-параметров (`split(';')[0]`) в обоих эндпоинтах: `/image` и `/audio`
  - Голосовой ввод теперь работает на HTTPS

- **Quick Fixes из аудита:**
  - Удалён дублированный `uvicorn.run()` в `backend/main.py`
  - `BottomInputBar.tsx`: убран лишний `isRecording` из интерфейса
  - `PasswordPrompt.tsx`: добавлена кнопка «Перейти в другую комнату»
  - `ChatSidebar.tsx`: иконка отправки `Plus rotate-90` → `SendHorizontal`
  - `Board.tsx`: скачивание архива в читаемом `.txt` формате вместо JSON

## Текущее ограничение:
Используется self-signed сертификат → браузер показывает предупреждение «Подключение не защищено». Следующий трек: **Домен + Let's Encrypt**.
