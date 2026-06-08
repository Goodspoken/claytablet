# Трек: Полный ребрендинг ClayTablet → ClayTablet (2026-05-12)

**Статус:** 🟡 В процессе (деплой выполнен, HTTPS ещё не поднялся, папка не переименована)
**Версия:** 0.3.0

---

## Что сделано в этом треке

### Ребрендинг кода (✅ завершено)
Заменены все вхождения во всей кодовой базе:

| Было | Стало |
|---|---|
| `ClayTablet` | `ClayTablet` |
| `/api/claytablet/` | `/api/claytablet/` |
| `claytablet_token` (cookie) | `claytablet_token` |
| `claytablet.db` | `claytablet.db` |
| `claytablet_theme/lang/username` (localStorage) | `claytablet_*` |
| `claytab` (CLI бинарь) | `claytablet` |
| `claytablet_sdk` (Plugin SDK) | `claytablet_sdk` |
| `github.com/claytablet/cli` (Go module) | `github.com/claytablet/claytablet/cli` |
| `claytablet.online` (домен в коде) | `claytablet.online` → затем `claytablet.online` |

Затронутые компоненты: backend (main.py, auth.py, database.py, constants.py, schemas.py, system_rooms.py, lan_qr.py, plugin_manager.py, plugin_sdk.py, tests), frontend (api.ts, все страницы, компоненты, контексты, stores, utils), CLI (все Go файлы, go.mod), Desktop (tauri.conf.json, Cargo.toml, все src файлы), Docker (docker-compose.yml, .env.example), документация (README, CLAUDE.md, маркетинг-доки).

### Canvas улучшения (✅ завершено)
Добавлено в `frontend/src/components/CanvasModal.tsx`:
- **Undo/Redo** — Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z, кнопки в тулбаре, 30 шагов истории
- **Текстовый инструмент** — клик на холст → floating input → Enter коммитит
- **Шаблоны фигур** — линия (Minus), прямоугольник (Square), круг/эллипс (Circle) с live preview
- Новые i18n ключи добавлены в `frontend/src/i18n.ts` (RU+EN)

### Домен (✅ куплен и настроен DNS)
- Куплен `claytablet.online` на reg.ru (249 ₽/год)
- DNS A-записи: `@` и `www` → `109.120.134.188`
- DNS прописался (проверено через Google DNS API)

### Caddyfile (✅ обновлён)
```
claytablet.online, www.claytablet.online {
    redir https://claytablet.online{uri}
}
claytablet.online, www.claytablet.online {
    ... основной блок ...
}
```
Убран `claytablet.ru` (не указывает на наш VPS — мешал cert challenge).

### Деплой на VPS (✅ контейнеры запущены)
- Создана папка `/opt/claytablet` на VPS
- Скопированы данные из `/opt/claytablet` включая БД
- БД переименована: `claytablet.db` → `claytablet.db`
- `.env` обновлён: `HOST_URL=https://claytablet.online`, `ALLOWED_ORIGINS=https://claytablet.online,...`
- Старые контейнеры `claytablet-*` остановлены
- Новые контейнеры `claytablet-backend` и `claytablet-frontend` запущены
- Health check: `http://localhost:8555/api/health` → `{"status":"ok"}`

### HTTPS (🟡 ожидание сертификата)
- HTTP работает: `http://claytablet.online` отвечает 308 → redirect to HTTPS
- Caddy запрашивает Let's Encrypt сертификат для `claytablet.online`
- **Проблема была**: Caddy пытался получить cert для `claytablet.ru` (не наш домен) → фиксировано убрав его из Caddyfile
- После фикса контейнер перезапущен, cert должен выпуститься автоматически в течение нескольких минут

---

## Что ещё нужно сделать

### Срочно (после пересоздания контейнера)

1. **Проверить HTTPS**:
   ```bash
   curl -s https://claytablet.online/api/health
   ```
   Должен вернуть `{"status":"ok"}`.
   Если нет — смотреть логи: `ssh illz@serverbook "ssh -p 2202 -i ~/.ssh/id_rsa_aeza admin@109.120.134.188 'cd /opt/claytablet && sudo docker compose logs frontend --tail=50'"`

2. **Переименовать папку на хосте** `popycast` → `claytablet`:
   - Закрыть VS Code / devcontainer
   - `mv /путь/к/popycast /путь/к/claytablet`
   - Обновить git remote: `git remote set-url origin https://github.com/claytablet/claytablet`
   - Открыть новую папку в VS Code, открыть `claytablet.code-workspace`

3. **GitHub — переименовать репозиторий**:
   - Settings → General → Repository name → `claytablet` → Rename
   - GitHub поставит редирект автоматически

4. **OAuth — добавить новый домен**:
   - Google Cloud Console → OAuth credentials → добавить `https://claytablet.online` в Authorized origins и `https://claytablet.online/api/auth/google/callback` в Authorized redirect URIs
   - Yandex OAuth → добавить `https://claytablet.online/api/auth/yandex/callback`

5. **UptimeRobot** — добавить монитор для `https://claytablet.online/api/health`

### Не срочно

6. **Лого** — финальный PNG (знак 𒁾 CLAY на глиняной табличке) добавить в проект:
   - `frontend/public/logo.png` (512×512) → обновить manifest.json
   - `frontend/public/favicon.ico`
   - `docs/logo.png` для README

7. **Demo GIF** — записать по инструкции в `docs/marketing/demo_gif_howto.md`, положить в `docs/demo.gif`

8. **Open Source запуск** — Reddit r/selfhosted + HN Show HN (тексты готовы в `docs/marketing/`)

9. **Старый стек на VPS** — `/opt/claytablet` можно удалить после проверки что всё работает на `claytablet.online`

---

## Структура на VPS после ребрендинга

```
/opt/claytablet/          ← новый рабочий каталог
  data/
    claytablet.db         ← база данных (скопирована из claytablet.db)
    media/            ← медиафайлы
  frontend/
    Caddyfile         ← claytablet.online + redirect claytablet.online
  .env                ← HOST_URL=https://claytablet.online

/opt/claytablet/      ← старый каталог (можно удалить)
```

---

## Логика имён

- **ClayTablet** = CLAY (𒁾, шумерское "глиняная табличка/послание") + Tab (вкладка браузера)
- Двойной смысл: древнейший носитель информации + современный интерфейс
- Домен: `claytablet.online`
- GitHub: `claytablet/claytablet`
- CLI: `claytablet` (бинарь)
- Cookie/localStorage prefix: `claytablet_`
- Docker containers: `claytablet-backend`, `claytablet-frontend`
- VPS path: `/opt/claytablet`
