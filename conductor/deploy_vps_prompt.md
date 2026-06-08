# Промпт для агента: Деплой PopyCast на VPS

> **Для пользователя:** Передай этот файл или его содержимое агенту (Grandfather или другому), у которого есть доступ к SSH-ключам Serverbook.
> **Обновлено:** 2026-06-06
> **Статус:** Доступ по SSH-ключу разработчика `~/.ssh/id_ed25519_deploy` уже преднастроен на сервере и VPS.

---

Привет! Нужно задеплоить свежие изменения проекта **PopyCast** на наш VPS.

Все изменения уже готовы и лежат синхронизированные на Serverbook в папке `/srv/storage/Projects/dubtab/` (в dev-контейнере смонтировано в `/home/vscode/projects/claytablet/`). Твоя задача — перенести их на VPS и пересобрать Docker-контейнеры.

## Инфраструктура

| Машина | Адрес | Роль |
|---|---|---|
| Serverbook | `illz@192.168.1.2` | Источник файлов (ключи авторизованы) |
| VPS (Clouvider UK) | `illz@213.255.246.146` | Продакшен-сервер |
| SSH порт VPS | `2203` | Нестандартный порт! |
| Проект на VPS | `/home/illz/claytablet` | Куда деплоим |
| Проект на Serverbook | `/srv/storage/Projects/dubtab/` | Откуда берём файлы |

## Важные тонкости — прочти до начала!

1. **SSH-порт VPS нестандартный** — всегда указывай `-p 2203`
2. **Используй ключ** — `-i ~/.ssh/id_ed25519_deploy` (уже авторизован на VPS и Serverbook)
3. **На Serverbook порт 80 занят AdGuardHome** — не пытайся там запускать контейнер на 80/443
4. **На VPS порты 80/443 свободны** — там Caddy слушает в режиме хоста и сам берёт SSL для `dubtab.pro`
5. **Домен** — `dubtab.pro` (legacy редирект с `claytablet.online`) → VPS `213.255.246.146`
6. **Не синхронизировать:** `.git`, `node_modules`, `frontend/node_modules`, `frontend/dist`, `data`, `__pycache__`, `.agents`
7. **Данные (`data/`)** — НЕ перезаписывать! Там живут загруженные пользователями медиафайлы

## Шаги деплоя

### Шаг 1. Проверь SSH-доступ к VPS

Выполни в dev-контейнере (или на Serverbook):

```bash
ssh -p 2203 -i ~/.ssh/id_ed25519_deploy -o ConnectTimeout=10 illz@213.255.246.146 "echo 'SSH OK' && docker --version"
```

Если выводит `SSH OK` и версию Docker — переходи к Шагу 2.

### Шаг 2. Синхронизируй файлы проекта на VPS

Выполни в dev-контейнере:

```bash
rsync -avz --progress \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'frontend/node_modules' \
  --exclude 'frontend/dist' \
  --exclude 'backend/__pycache__' \
  --exclude 'backend/venv' \
  --exclude 'data' \
  --exclude '*.tar.gz' \
  --exclude '.agents' \
  -e "ssh -p 2203 -i ~/.ssh/id_ed25519_deploy -o StrictHostKeyChecking=no" \
  ./ \
  illz@213.255.246.146:/home/illz/claytablet/
```

Дождись завершения. Убедись, что нет ошибок.

### Шаг 3. Пересобери и перезапусти контейнеры на VPS

```bash
ssh -p 2203 -i ~/.ssh/id_ed25519_deploy illz@213.255.246.146 "
  cd /home/illz/claytablet
  sudo docker compose down --remove-orphans
  sudo docker compose up -d --build
  sudo docker compose ps
"
```

### Шаг 4. Проверь, что всё работает

```bash
# Посмотри логи backend
ssh -p 2203 -i ~/.ssh/id_ed25519_deploy illz@213.255.246.146 "cd /home/illz/claytablet && sudo docker compose logs --tail=30 backend"

# Посмотри статус всех контейнеров
ssh -p 2203 -i ~/.ssh/id_ed25519_deploy illz@213.255.246.146 "sudo docker ps"
```

Контейнеры `claytablet-backend` и `gsk-caddy` должны быть в статусе `running` (не `restarting` и не `exited`).

### Шаг 5. Финальная проверка приложения

Открой в браузере: **`https://dubtab.pro`** (или `https://claytablet.online`)

Убедись, что:
- [ ] Страница открывается без ошибок SSL
- [ ] Тёмная тема работает (кнопка луна/солнце в шапке)
- [ ] Переключение языка RU/EN работает
- [ ] Пустая доска красиво отображается

---

## Если что-то пошло не так

**Caddy не поднимается (503 / Caddy ошибка SSL):**
```bash
ssh -p 2203 -i ~/.ssh/id_ed25519_deploy illz@213.255.246.146 "sudo docker logs gsk-caddy 2>&1 | tail -50"
```
Вероятная причина: порт 80 или 443 занят на VPS. Проверь: `sudo ss -tlnp | grep -E ':80|:443'`

**Backend не отвечает:**
```bash
ssh -p 2203 -i ~/.ssh/id_ed25519_deploy illz@213.255.246.146 "sudo docker logs claytablet-backend 2>&1 | tail -30"
```

---

## Результат

После успешного деплоя сообщи пользователю:
