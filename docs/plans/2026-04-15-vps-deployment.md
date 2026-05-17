# VPS Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Развернуть проект Clipboard в Docker-контейнерах на удаленном VPS (109.120.134.188).

**Architecture:** Многоконтейнерное Docker-приложение. Nginx раздает статику фронтенда и проксирует запросы на бэкенд (FastAPI) внутри сети.

**Tech Stack:** Docker, Docker Compose, SSH, Rsync, UFW.

---

### Task 1: Подготовка окружения на VPS

**Files:**
- Создание: Рабочая директория на VPS (`/opt/clipboard`).

**Step 1: Создать директорию проекта**

Run: `ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519 admin@109.120.134.188 'sudo mkdir -p /opt/clipboard && sudo chown -R admin:admin /opt/clipboard'`
Expected: Директория создана без ошибок.

### Task 2: Перенос кода на сервер

**Files:**
- Модификация: Файлы проекта на сервере.

**Step 1: Синхронизировать файлы через rsync**

Run: `rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'backend/__pycache__' --exclude 'frontend/dist' -e "ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519" ./ admin@109.120.134.188:/opt/clipboard/`
Expected: Файлы успешно скопированы на сервер.

### Task 3: Настройка UFW (Firewall)

**Files:**
- Модификация: Правила UFW на сервере.

**Step 1: Открыть порты для внешних сервисов**

Run: `ssh -i ~/.ssh/id_ed25519 admin@109.120.134.188 'sudo ufw allow 8505/tcp && sudo ufw allow 8555/tcp && sudo ufw reload'`
Expected: Сообщение об успешном обновлении правил ("Rules updated").

### Task 4: Запуск и проверка контейнеров

**Files:**
- Чтение: Состояние Docker-контейнеров на сервере.

**Step 1: Сборка и запуск контейнеров в фоне**

Run: `ssh -i ~/.ssh/id_ed25519 admin@109.120.134.188 'cd /opt/clipboard && docker compose up -d --build'`
Expected: Сообщения об успешной сборке образов и запуске `clipboard-backend` и `clipboard-frontend`.

**Step 2: Проверка статуса контейнеров**

Run: `ssh -i ~/.ssh/id_ed25519 admin@109.120.134.188 'cd /opt/clipboard && docker compose ps'`
Expected: Статус `Up` для обоих сервисов.

**Step 3: Проверка логов на наличие ошибок**

Run: `ssh -i ~/.ssh/id_ed25519 admin@109.120.134.188 'cd /opt/clipboard && docker compose logs --tail=20'`
Expected: Отсутствие критических ошибок запуска.
