# Трек: Ребрендинг и интеграция авторизации (OAuth)

**Статус:** 🚀 В процессе
**Приоритет:** 🔴 Высокий
**Цель:** Переезд на новый домен, смена названия и настройка входа через Google/Yandex.

## Задачи

- [x] **1. Покупка домена и настройка DNS**
  - Купить домен: `claytablet.online` (основной) и `claytablet.ru` (зеркало)
  - Направить A-записи обоих доменов на IP: `109.120.134.188`
- [x] **2. Обновление конфигурации (Caddy & Backend)**
  - Обновить `Caddyfile` на новый домен для получения SSL
  - Обновить `HOST_URL` в переменных окружения бэкенда (добавлено в `docker-compose.yml`)
- [ ] **3. Настройка Google OAuth**
  - Создать проект в Google Cloud Console
  - Получить `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET`
  - Добавить Redirect URI: `https://[DOMAIN]/api/auth/google/callback`
- [ ] **4. Настройка Yandex OAuth**
  - Создать приложение в Yandex OAuth
  - Получить `YANDEX_CLIENT_ID` и `YANDEX_CLIENT_SECRET`
  - Добавить Redirect URI: `https://[DOMAIN]/api/auth/yandex/callback`
- [ ] **5. Финализация ребрендинга**
  - Заменить "PopyCast" на новое название в коде (Header, Title, Meta)
  - Обновить логотип/иконку (при необходимости)

## Инфраструктурные изменения
- Обновление `.env` файла на VPS
- Рестарт docker-compose контейнеров
