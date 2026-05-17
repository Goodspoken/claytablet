# RSS Auto-Post Plugin

Автоматически постит новые записи из RSS/Atom-лент в комнаты ClayTablet по расписанию.

## Установка

```bash
# 1. Плагин уже находится в plugins/rss-fetcher/ — ничего копировать не нужно

# 2. Установи зависимость feedparser в контейнер бэкенда
docker compose exec backend pip install feedparser

# Или добавь в backend/requirements.txt и пересобери:
echo "feedparser>=6.0" >> backend/requirements.txt
docker compose up -d --build backend

# 3. Создай конфиг
cp plugins/rss-fetcher/config.json.example plugins/rss-fetcher/config.json
# Отредактируй config.json под свои ленты

# 4. Перезапусти бэкенд чтобы плагин загрузился
docker compose restart backend
```

## Конфигурация (`config.json`)

```json
{
  "feeds": [
    {
      "url": "https://hnrss.org/frontpage",
      "room_id": "hacker-news",
      "limit": 5,
      "interval_hours": 1,
      "prefix": "📰"
    }
  ],
  "dedup_hours": 24
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `url` | string | URL RSS или Atom ленты |
| `room_id` | string | ID комнаты для публикации |
| `limit` | int | Максимум новых записей за один прогон |
| `interval_hours` | float | Интервал проверки в часах (1 = каждый час) |
| `prefix` | string | Эмодзи-префикс перед заголовком |
| `dedup_hours` | float | Не постить одну запись повторно N часов |

> Изменения в `config.json` применяются при **следующем запуске по расписанию** без рестарта сервера.

## API эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| `GET` | `/api/plugins/rss-fetcher/status` | Статус: кол-во лент, записей в памяти, время последнего запуска |
| `GET` | `/api/plugins/rss-fetcher/config` | Текущий config.json |
| `POST` | `/api/plugins/rss-fetcher/fetch-now` | Немедленно запустить парсинг (для отладки) |

### Пример проверки

```bash
# Статус
curl http://localhost:8000/api/plugins/rss-fetcher/status

# Немедленный запуск (удобно при тестировании)
curl -X POST http://localhost:8000/api/plugins/rss-fetcher/fetch-now
```

## Поведение

- Плагин запускается **каждый час в :00** (cron `0 * * * *`)
- Каждая лента может иметь свой `interval_hours` — более редкие ленты пропускаются если ещё не время
- **Дедупликация**: одна и та же запись не публикуется повторно в течение `dedup_hours` часов
- Если лента недоступна — ошибка логируется, остальные ленты продолжают работать
- Если `room_id` не существует — ошибка логируется, запись не публикуется

## Логи

```bash
docker compose logs backend | grep rss-fetcher
```

Пример вывода:
```
[rss-fetcher] loaded — 2 feed(s) configured
[rss-fetcher] Posted 3 item(s) from https://hnrss.org/frontpage → hacker-news
```
