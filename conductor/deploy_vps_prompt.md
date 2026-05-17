# Промпт для агента: Деплой PopyCast на VPS

> **Для пользователя:** Передай этот файл или его содержимое агенту (Grandfather или другому), у которого есть доступ к SSH-ключам Serverbook.
> **Обновлено:** 2026-04-26

---

Привет! Нужно задеплоить свежие изменения проекта **PopyCast** на наш VPS.

Все изменения уже готовы и лежат синхронизированные на Serverbook в папке `/srv/storage/Projects/popycast/`. Твоя задача — перенести их на VPS и пересобрать Docker-контейнеры.

## Инфраструктура

| Машина | Адрес | Роль |
|---|---|---|
| Serverbook | `illz@192.168.1.2` | Источник файлов (SSH-ключи здесь) |
| VPS (Aeza) | `admin@109.120.134.188` | Продакшен-сервер |
| SSH порт VPS | `2202` | Нестандартный порт! |
| Проект на VPS | `/opt/clipboard` | Куда деплоим |
| Проект на Serverbook | `/srv/storage/Projects/popycast/` | Откуда берём файлы |

## Важные тонкости — прочти до начала!

1. **SSH-порт VPS нестандартный** — всегда указывай `-p 2202`
2. **На Serverbook порт 80 занят AdGuardHome** — не пытайся там запускать контейнер на 80/443
3. **На VPS порты 80/443 свободны** — там Caddy слушает и сам берёт SSL от Let's Encrypt
4. **Домен** — `popycast.duckdns.org` → VPS `109.120.134.188`
5. **Не синхронизировать:** `.git`, `node_modules`, `frontend/dist`, `data`, `__pycache__`, `.agents`
6. **Данные (`data/`)** — НЕ перезаписывать! Там живут загруженные пользователями медиафайлы

## Шаги деплоя

### Шаг 1. Проверь SSH-доступ к VPS с Serverbook

Подключись к Serverbook (`illz@192.168.1.2`) и выполни:

```bash
ssh -p 2202 -i ~/.ssh/id_rsa_aeza -o ConnectTimeout=10 admin@109.120.134.188 "echo 'SSH OK' && docker --version"
```

Если выводит `SSH OK` и версию Docker — переходи к Шагу 2.

Если ошибка ключа — проверь: `ls ~/.ssh/` — должен быть `id_rsa_aeza`. Если ключа нет, сообщи пользователю.

### Шаг 2. Синхронизируй файлы проекта на VPS

Выполни на Serverbook (или через SSH в Serverbook):

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
  -e "ssh -p 2202 -i ~/.ssh/id_rsa_aeza -o StrictHostKeyChecking=no" \
  /srv/storage/Projects/popycast/ \
  admin@109.120.134.188:/opt/clipboard/
```

Дождись завершения. Убедись что нет ошибок.

### Шаг 3. Пересобери и перезапусти контейнеры на VPS

```bash
ssh -p 2202 -i ~/.ssh/id_rsa_aeza admin@109.120.134.188 "
  cd /opt/clipboard
  docker compose down --remove-orphans
  docker compose up -d --build
  docker compose ps
"
```

> ⚠️ Если `docker compose down` покажет ошибку про orphaned containers — это нормально, продолжай.
> ⚠️ Если выдаёт конфликт имён контейнеров — выполни: `docker rm -f popycast-backend popycast-frontend` и повтори `up -d`.

### Шаг 4. Проверь что всё работает

```bash
# Посмотри логи frontend (Caddy + SSL)
ssh -p 2202 -i ~/.ssh/id_rsa_aeza admin@109.120.134.188 "cd /opt/clipboard && docker compose logs --tail=30 frontend"

# Посмотри статус всех контейнеров
ssh -p 2202 -i ~/.ssh/id_rsa_aeza admin@109.120.134.188 "cd /opt/clipboard && docker compose ps"
```

Оба контейнера должны быть в статусе `running` (не `restarting` и не `exited`).

### Шаг 5. Финальная проверка приложения

Открой в браузере: **`https://dubtab.app`**

Убедись что:
- [ ] Страница открывается без ошибок SSL
- [ ] Тёмная тема работает (кнопка луна/солнце в шапке)
- [ ] Переключение языка RU/EN работает
- [ ] Пустая доска красиво отображается

---

## Если что-то пошло не так

**Caddy не поднимается (503 / Caddy ошибка SSL):**
```bash
ssh -p 2202 -i ~/.ssh/id_rsa_aeza admin@109.120.134.188 "docker logs dubtab-frontend 2>&1 | tail -50"
```
Вероятная причина: порт 80 или 443 занят на VPS. Проверь: `sudo ss -tlnp | grep -E ':80|:443'`

**Backend не отвечает:**
```bash
ssh -p 2202 -i ~/.ssh/id_rsa_aeza admin@109.120.134.188 "docker logs dubtab-backend 2>&1 | tail -30"
```

**Быстрый рестарт без пересборки (если уже собрано):**
```bash
ssh -p 2202 -i ~/.ssh/id_rsa_aeza admin@109.120.134.188 "cd /opt/clipboard && docker compose restart"
```

---

## Результат

После успешного деплоя сообщи пользователю:
- Ссылка: `https://dubtab.app`
- Статус контейнеров (вывод `docker compose ps`)
- Версию из CHANGELOG если доступна (сейчас v2.2.0)
