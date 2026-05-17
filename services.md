# PopyCast (DubTab) — Карта сервисов

> Все внешние сервисы, кабинеты и мониторинги проекта. Обновлено: 2026-05-04. (v2 — Security Audit Complete)

---

## 🌐 Сайт и инфраструктура

| Сервис | Ссылка | Логин | Что делать |
|--------|--------|-------|-----------|
| **Основной домен** | [https://dubtab.app](https://dubtab.app) | — | Основной вход |
| **Зеркало RU** | [https://dubtab.ru](https://dubtab.ru) | — | Редирект на .online |
| **Технический домен** | [https://popycast.duckdns.org](https://popycast.duckdns.org) | — | Для тестов / резерв |
| **API Swagger** | [https://dubtab.app/docs](https://dubtab.app/docs) | — | Документация API |

---

## ☁️ Облачные сервисы (Auth & DNS)

| Сервис | Ссылка | Аккаунт | Что там |
|--------|--------|---------|---------|
| **Яндекс OAuth** | [https://oauth.yandex.ru](https://oauth.yandex.ru) | happyrussian1@yandex.ru | Авторизация (DubTab). Redirect: /api/auth/yandex/callback |
| **Google Console** | [https://console.cloud.google.com](https://console.cloud.google.com) | — | Google OAuth (DubTab). Redirect: /api/auth/google/callback |
| **DuckDNS** | [https://www.duckdns.org](https://www.duckdns.org) | — | Управление доменом popycast.duckdns.org |

---

## 🔴 Мониторинг и ошибки

| Сервис | Ссылка | Аккаунт | Что там |
|--------|--------|---------|---------|
| **Sentry** | [https://sentry.io](https://sentry.io) | — | Ошибки бэкенда и фронтенда. Проекты: `popycast-backend`, `popycast-frontend` |
| **UptimeRobot** | [https://uptimerobot.com](https://uptimerobot.com) | — | Мониторинг доступности https://dubtab.app |

---

## 🖥️ Серверы (Deployment)

| Сервер | Адрес | Доступ | Что там |
|--------|-------|--------|---------|
| **VPS (Aeza/Cloud)** | 109.120.134.188 | `ssh -p 2202 admin@109.120.134.188` | Основной сервер. Docker: backend, frontend (Caddy), sqlite |
| **Директория проекта** | `/opt/clipboard` | — | `docker-compose.yml`, `data/` (база и медиа) |

---

## 📋 Быстрые команды (Deployment & Logs)

```bash
# Деплой с локальной машины (Windows PowerShell)
.\deploy.ps1

# Статус контейнеров на сервере
ssh -p 2202 admin@109.120.134.188 "cd /opt/clipboard && docker compose ps"

# Перезапуск бэкенда
ssh -p 2202 admin@109.120.134.188 "cd /opt/clipboard && docker compose restart backend"

# Просмотр логов в реальном времени
ssh -p 2202 admin@109.120.134.188 "cd /opt/clipboard && docker compose logs -f --tail=100"

# Gemini CLI (Интегрирован в контейнер)
gemini --help

# Очистка старых логов Docker
ssh -p 2202 admin@109.120.134.188 "docker system prune -f"
```

---

## 🛠️ Инструменты разработчика

| Инструмент | Команда / Ссылка | Описание |
|------------|------------------|----------|
| **CLI (dubtab)** | `dubtab login` | Управление комнатами из терминала |
| **Gemini CLI** | `gemini --help` | Работа с Google Gemini AI из терминала |
| **Локальный dev** | `npm run dev` / `uvicorn main:app` | Запуск фронта (:5173) и бэка (:8000) |
| **Self-hosted** | `./install.sh` | Скрипт быстрой установки на новый сервер |
