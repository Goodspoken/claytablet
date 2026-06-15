<div align="center">

# 🪧 ClayTablet

**В режиме реального времени: общий буфер обмена, хранилище файлов и текстовый блокнот между всеми вашими устройствами.**

Скопировали текст на ноутбуке → он уже на вашем телефоне. Перетащили файл в окно браузера → можете скачать его прямо из терминала. Никаких учетных записей, никаких облачных регистраций и привязки к конкретным экосистемам.

[**🌐 claytablet.online**](https://claytablet.online) · [Документация (англ.)](https://github.com/claytablet/claytablet/wiki) · [Релизы](https://github.com/claytablet/claytablet/releases) · [English Readme](README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-compose-blue?logo=docker)](https://github.com/claytablet/claytablet)
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue?logo=python)](https://www.python.org/)
[![React 19](https://img.shields.io/badge/react-19-61dafb?logo=react)](https://react.dev/)
[![Tauri 2](https://img.shields.io/badge/tauri-2-orange?logo=tauri)](https://tauri.app/)

<img src="docs/demo.gif" alt="Демонстрация ClayTablet" width="720" />

</div>

---

## ✨ Почему именно ClayTablet?

Знакомая ситуация: вы копируете длинный токен на ноутбуке, а затем вынуждены вводить его символ за символом на телефоне. Или делаете скриншот на телефоне, который нужен на компьютере прямо сейчас. ClayTablet — это одна простая веб-страница (или команда в терминале), которая решает эту проблему для каждого вашего устройства.

- 🚀 **В реальном времени** — WebSocket, синхронизация менее чем за 100 мс.
- 🔐 **Локальный контроль** — одна команда `docker compose up`, и вы полностью владеете своими данными.
- 📱 **Везде** — Web, Desktop (Tauri), Mobile (Expo), CLI-интерфейс в терминале, поддержка системного меню «Поделиться» на Android и iOS.
- 🔌 **Расширяемый** — просто добавьте Python-файл в папку `plugins/`, чтобы добавить свои обработчики событий, планировщик или дополнительные API-методы.
- 🆓 **Полностью бесплатно** — лицензия MIT, никакой рекламы, платных подписок или скрытой телеметрии.

---

## 🎬 Быстрый запуск за 30 секунд

```bash
# Запустить собственный сервер
curl -fsSL https://raw.githubusercontent.com/claytablet/claytablet/main/install.sh | bash
# Сервер откроется на http://<ваш-локальный-ip>:8080 — отсканируйте QR-код телефоном, и всё готово.
```

Или просто используйте публичный сервер: откройте **[claytablet.online](https://claytablet.online)** → введите любое имя комнаты → пишите и вставляйте данные с любого устройства.

---

## 📸 Скриншоты

<table>
  <tr>
    <td><img src="docs/screenshots/desktop.png" alt="Веб-версия" width="350" /></td>
    <td><img src="docs/screenshots/mobile.png" alt="Мобильная версия" width="180" /></td>
  </tr>
  <tr>
    <td align="center">Веб-приложение с текстом, изображениями, голосовыми заметками и чатом</td>
    <td align="center">Мобильная панель (адаптивная)</td>
  </tr>
</table>

---

## 🛠 Возможности

### Типы контента
- **Текст** — вставляйте через `Ctrl+V`, пишите, вставляйте многострочный текст, автоматическое распознавание ссылок и превью для YouTube.
- **Изображения** — вставка из буфера, drag-and-drop, пакетная загрузка, предпросмотр в полный экран и копирование обратно в один клик.
- **Голосовые заметки** — запись аудио прямо в браузере с помощью кроссплатформенного MediaRecorder.
- **Любые файлы** — любого формата, объемом до 50 МБ (поддерживается потоковая загрузка).
- **Рисунки** — встроенный холст для рисования от руки с поддержкой тач-скринов.
- **Чат** — текстовый чат внутри комнаты с поддержкой никнеймов.

### Совместный доступ и приватность
- **Комнаты по URL** — например, `claytablet.online/моя-комната`, а также список публичных комнат в лобби.
- **Защита паролем** — хэширование паролей с помощью bcrypt и встроенная защита от перебора (rate-limit).
- **Режим «Только для чтения»** — владелец может добавлять записи, а гости — только просматривать и копировать.
- **Персональные комнаты** — привязка к вашему аккаунту OAuth (Google / Яндекс), такие комнаты никогда не удаляются автоматически.
- **QR-коды** — поделитесь комнатой с помощью быстрого сканирования камерой телефона.
- **Настраиваемое время жизни (TTL)** — автоматическая очистка неактивных комнат через 10 минут, 1 час, сутки, 7 дней или хранение навсегда.

### Приложения-клиенты
- **Web** — React 19 + Tailwind v4, темная тема, поддержка языков (RU/EN).
- **Desktop** ([релизы](https://github.com/claytablet/claytablet/releases)) — приложение на Tauri 2 (для Windows, Linux, macOS), поддержка глобальных горячих клавиш `Ctrl+Shift+V` / `Ctrl+Shift+C`, сворачивание в системный трей, автообновление.
- **Mobile** — React Native + Expo (Android, iOS) — [отдельный репозиторий](https://github.com/claytablet/claytablet-mobile).
- **CLI** — Go-клиент `claytablet`: команды `ls`, `send`, `copy`, `watch`, а также интерактивный текстовый TUI-интерфейс прямо в консоли.
- **PWA Share Target** — добавьте сайт на главный экран телефона, и ClayTablet появится в системном меню «Поделиться» вашего телефона наряду с другими приложениями.

### Для хостинга и системных администраторов
- **Docker Compose** — развертывание одной командой с авто-подключением HTTPS через Caddy и Let's Encrypt.
- **Локальный режим (LAN)** — работает в домашней сети без доступа к интернету, автоматически генерирует QR-код с вашим локальным IP при старте.
- **Движок плагинов** — просто положите папку вида `plugins/my-plugin/plugin.py` с декораторами `@hook`, `@scheduled`, или `@http.get` для кастомных хуков, крон-задач или API-эндпоинтов.

---

## 🚀 Быстрый старт

### Вариант 1 — Публичный сервер (без настроек)
Откройте [claytablet.online](https://claytablet.online), введите название комнаты и пользуйтесь.

### Вариант 2 — Установка одной командой на свой сервер
```bash
curl -fsSL https://raw.githubusercontent.com/claytablet/claytablet/main/install.sh | bash
```
Скрипт автоматически сгенерирует JWT-секреты, определит локальный IP-адрес сервера и выведет QR-код в консоль. Настройки можно изменить в файле `~/.claytablet/.env`.

### Вариант 3 — Docker Compose
```bash
git clone https://github.com/claytablet/claytablet
cd claytablet
cp .env.example .env       # настройте JWT_SECRET, HOST_URL, ALLOWED_ORIGINS
docker compose up -d --build
```

### Вариант 4 — Использование публичного сервера из консоли (CLI)
```bash
curl -fsSL https://claytablet.online/claytablet-linux-amd64 -o claytablet && chmod +x claytablet
./claytablet login                    # Авторизация через браузер
./claytablet send "привет из терминала"
cat error.log | ./claytablet send     # отправка лога через конвейер (pipe)
./claytablet tui                      # запуск интерактивной панели в консоли
```

---

## 🔌 Плагины

Просто скопируйте папку с плагином в `plugins/` и перезапустите сервер. Плагины работают без изоляции, что идеально подходит для частных инсталляций.

```python
# plugins/my-plugin/plugin.py
from claytablet_sdk import hook, scheduled, http, api

@hook("on_text_added")
async def on_text(room_id: str, content: str, item_id: str):
    if "TODO" in content:
        await api.add_chat(room_id, "bot", "Не забудь выполнить!")

@scheduled("0 9 * * *")             # каждый день в 9 утра
async def morning_briefing():
    await api.add_text("daily", "☀️ Доброе утро!")

@http.get("/status")
async def status(request):
    return {"ok": True}              # доступно по адресу /api/plugins/my-plugin/status
```

Подробное описание: [plugins/PLUGIN_API.md](plugins/PLUGIN_API.md) (англ.)

---

## 🏗 Технологический стек

| Слой | Технологии |
|---|---|
| Бэкенд | Python 3.11 · FastAPI · SQLAlchemy + Alembic · SQLite · WebSocket · APScheduler |
| Фронтенд | React 19 · Vite · Tailwind v4 · Zustand · TypeScript |
| Desktop | Tauri 2 (Rust) · Windows / Linux / macOS |
| Мобильный | React Native · Expo SDK 54 |
| CLI | Go 1.22 · Cobra · bubbletea + lipgloss (TUI) |
| Прокси | Caddy (автоматический Let's Encrypt / внутренний TLS) |
| Контейнеры | Docker · Docker Compose |

---

## 🤝 Содействие и Open-Source сотрудничество

Мы активно ищем соразработчиков, бета-тестеров и всех, кто хочет помочь проекту! ClayTablet — это полностью открытый продукт, и мы будем рады любому сотрудничеству.

Нам особенно нужна помощь в тестировании, доработке интерфейса и сборке релизных пакетов для:
- **macOS и Windows** (клиент на Tauri v2 в папке [desktop/](file:///home/vscode/claytablet/desktop))
- **Android и iOS** (клиент на React Native + Expo в папке [mobile/](file:///home/vscode/claytablet/mobile))
- **Linux, macOS, Windows CLI** (консольный клиент на Go в папке [cli/](file:///home/vscode/claytablet/cli))
- **Локализация** (перевод веб-интерфейса и приложений на другие языки)

Если вы хотите протестировать ClayTablet на своих устройствах, сообщить об ошибке, предложить новую функцию или отправить Pull Request — добро пожаловать!

Перед отправкой Pull Request убедитесь, что тесты проходят:
```bash
cd backend && pytest tests/ -v && ruff check .
cd frontend && npm run lint && npm run build
```

Подробности см. в файле [CONTRIBUTING.md](CONTRIBUTING.md) (англ.). Мы будем рады любой помощи и открыты к общению!

---

## 📜 Лицензия

Лицензия MIT. Делайте всё, что хотите, только не вините автора, если что-то сломается. См. полный текст в файле [LICENSE](LICENSE).

Если ClayTablet сэкономил вам время, поддержите репозиторий звездой на GitHub! ⭐
