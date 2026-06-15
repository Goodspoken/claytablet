"""Built-in system rooms metadata + seeding logic."""
import logging
import time
import uuid

from sqlalchemy.orm import Session

import models

logger = logging.getLogger("claytablet")

SYSTEM_ROOMS = [
    {
        "id": "_help",
        "emoji": "❓",
        "title_ru": "Помощь",
        "title_en": "Help",
        "description_ru": "FAQ и инструкции по использованию ClayTablet",
        "description_en": "FAQ and how-to guides for ClayTablet",
        "content_ru": (
            "Добро пожаловать в справочник ClayTablet! Ниже приведены основные функции и настройки для локальной версии.\n\n"
            "### 📋 Как отправлять данные:\n"
            "* **Текст и ссылки:** Наберите текст в поле ввода вверху и нажмите `Enter` (или кнопку отправки).\n"
            "* **Файлы и изображения:**\n"
            "  * Перетащите их мышкой в любое место окна (Drag & Drop).\n"
            "  * Нажмите кнопку скрепки `📎` для выбора файлов с устройства.\n"
            "  * Вставьте картинку или текст напрямую из буфера обмена (`Ctrl+V`).\n\n"
            "### 🎤 Голосовые сообщения:\n"
            "* Зажмите кнопку микрофона `🎤` в поле ввода, наговорите сообщение и отпустите для отправки.\n\n"
            "### 🎨 Рисование (Canvas):\n"
            "* Нажмите кнопку с палитрой `🎨` рядом с вводом, чтобы открыть холст для рисования схем или эскизов. Рисунок сохранится как изображение.\n\n"
            "### 🔒 Безопасность и настройки комнаты:\n"
            "В правом верхнем углу нажмите кнопку шестеренки для доступа к настройкам:\n"
            "* **Авто-очистка:** Задайте время жизни доски (1 час, 24 часа, неделя).\n"
            "* **Пароль:** Защитите вход в комнату паролем.\n"
            "* **Только чтение:** Запретите гостям изменять доску (полезно при шаринге).\n\n"
            "### 🌐 Особенности работы в HTTP и HTTPS:\n"
            "* Браузер разрешает автоматическую вставку по кнопке `Вставить из буфера` только по безопасному протоколу `https://` или на `localhost`.\n"
            "* **Если сайт открыт по HTTP (например, http://192.168.1.2:8505):** Авто-вставка заблокирована браузером. Пожалуйста, используйте стандартное сочетание клавиш `Ctrl+V` на странице для отправки текста/картинок из буфера.\n"
            "* **Как включить HTTPS локально:** Инструкции по настройке SSL-сертификата на хосте Caddy описаны в файле [LOCAL_PASSPORT.md](file:///home/vscode/claytablet/LOCAL_PASSPORT.md)."
        ),
        "content_en": (
            "Welcome to the ClayTablet user guide! Below are the main features and tips for the local deployment.\n\n"
            "### 📋 How to share data:\n"
            "* **Text & Links:** Type text in the input bar at the top and press `Enter` (or click Send).\n"
            "* **Files & Images:**\n"
            "  * Drag & Drop files anywhere on the page.\n"
            "  * Click the paperclip icon `📎` to attach files from your device.\n"
            "  * Paste text or images directly using `Ctrl+V`.\n\n"
            "### 🎤 Voice Messages:\n"
            "* Press and hold the microphone icon `🎤` in the input bar, record your message, and release it to send.\n\n"
            "### 🎨 Drawing (Canvas):\n"
            "* Click the palette icon `🎨` next to the input bar to draw sketches or diagrams. The drawing will be saved as an image card.\n\n"
            "### 🔒 Room Settings & Security:\n"
            "Click the gear icon in the top right to open settings:\n"
            "* **Auto-delete:** Set board TTL (1 hour, 24 hours, 7 days).\n"
            "* **Password:** Protect room entry with a password.\n"
            "* **Read-only:** Prevent guests from modifying the board (great for sharing read-only info).\n\n"
            "### 🌐 HTTP vs HTTPS Limitations:\n"
            "* Modern browsers block automatic paste via the screen button unless the site runs under secure `https://` context or on `localhost`.\n"
            "* **If accessed via HTTP (e.g. http://192.168.1.2:8505):** Auto-paste is blocked by the browser. Please use the standard `Ctrl+V` hotkey on the page to paste text or images.\n"
            "* **How to enable local HTTPS:** Instructions for configuring SSL/TLS certificates on the Caddy server are detailed in [LOCAL_PASSPORT.md](file:///home/vscode/claytablet/LOCAL_PASSPORT.md)."
        )
    },
    {
        "id": "_about",
        "emoji": "📖",
        "title_ru": "О проекте",
        "title_en": "About",
        "description_ru": "Что такое ClayTablet, идея и принципы",
        "description_en": "What ClayTablet is — idea and principles",
        "content_ru": (
            "**ClayTablet** — это легковесный, приватный веб-сервис для мгновенного обмена текстом, ссылками, изображениями, аудио и файлами между любыми устройствами в локальной сети или глобально.\n\n"
            "### Основная идея\n"
            "Упростить передачу данных между компьютером, телефоном, планшетом без необходимости регистрироваться, вводить логины/пароли, подключать Bluetooth или использовать тяжелые мессенджеры. Вы просто открываете уникальный URL комнаты на всех устройствах, и они мгновенно синхронизируются.\n\n"
            "### Ключевые принципы:\n"
            "1. **Приватность и контроль:** Все данные хранятся локально на вашем сервере в SQLite и не передаются третьим лицам.\n"
            "2. **Эфемерность:** Комнаты создаются на время. Через 24 часа неактивности комната и все её файлы автоматически удаляются.\n"
            "3. **Открытый код (Open Source):** Прозрачный код, доступный для самостоятельного хостинга (self-hosting).\n"
            "4. **Кроссплатформенность:** Работает на любой ОС через браузер, десктопное приложение Tauri, мобильный клиент или CLI-утилиту."
        ),
        "content_en": (
            "**ClayTablet** is a lightweight, privacy-focused web service for instant sharing of text, links, images, audio, and files across devices in a local network or globally.\n\n"
            "### Core Idea\n"
            "To simplify data sharing between your PC, phone, and tablet without needing sign-ups, passwords, Bluetooth pairing, or heavy messenger apps. Simply open a unique room URL on all devices, and they sync instantly.\n\n"
            "### Key Principles:\n"
            "1. **Privacy & Control:** All data is stored locally on your server in SQLite and never shared with third parties.\n"
            "2. **Ephemerality:** Rooms are temporary. After 24 hours of inactivity, the room and all its media files are automatically deleted.\n"
            "3. **Open Source:** Transparent code, ready for self-hosting.\n"
            "4. **Cross-platform:** Works on any OS via web browser, Tauri desktop application, mobile client, or CLI utility."
        )
    },
    {
        "id": "_me",
        "emoji": "👤",
        "title_ru": "Об авторе",
        "title_en": "About the author",
        "description_ru": "Кто делает ClayTablet",
        "description_en": "Who is building ClayTablet",
    },
    {
        "id": "_log",
        "emoji": "📅",
        "title_ru": "Жизнь проекта",
        "title_en": "Changelog",
        "description_ru": "Что нового, планы и история версий",
        "description_en": "What's new, plans, and version history",
    },
    {
        "id": "_team",
        "emoji": "🤝",
        "title_ru": "Команда и благодарности",
        "title_en": "Team & Credits",
        "description_ru": "Контрибьюторы, доноры и все, кто помогает",
        "description_en": "Contributors, donors and everyone who helps",
    },
    {
        "id": "_terms",
        "emoji": "📜",
        "title_ru": "Условия использования",
        "title_en": "Terms of use",
        "description_ru": "Бесплатно, открытый код. Делитесь улучшениями.",
        "description_en": "Free and open source. Please share improvements back.",
    },
]


def _expected_seed_content(room_meta: dict) -> str:
    if "content_ru" in room_meta and "content_en" in room_meta:
        return (
            f"🇷🇺 **{room_meta['title_ru']}**\n\n{room_meta['content_ru']}\n\n"
            f"---\n\n"
            f"🇬🇧 **{room_meta['title_en']}**\n\n{room_meta['content_en']}"
        )
    return (
        f"{room_meta['emoji']} **{room_meta['title_ru']} / {room_meta['title_en']}**\n\n"
        f"🇷🇺 {room_meta['description_ru']}\n"
        f"🇬🇧 {room_meta['description_en']}"
    )


def seed_system_rooms(db: Session) -> None:
    """Create system rooms if missing; refresh stale auto-seeded content.

    Existing items are left untouched, EXCEPT the very first auto-seeded item
    whose text still references the old "ClayTablet" / "PopyCast" brand — those
    are rewritten so live deployments pick up the rename without a manual
    migration. Any item edited by a human (anything that doesn't match the
    legacy seed pattern) is preserved.
    """
    for room_meta in SYSTEM_ROOMS:
        room_id = room_meta["id"]
        existing = db.query(models.Room).filter(models.Room.id == room_id).first()
        expected_content = _expected_seed_content(room_meta)

        if existing:
            # Only touch the seed item if it still looks auto-generated AND mentions
            # the legacy brand name. Don't clobber user-authored content.
            first_item = (
                db.query(models.Item)
                .filter(models.Item.room_id == room_id, models.Item.item_type == "text")
                .order_by(models.Item.timestamp.asc())
                .first()
            )
            if first_item is not None and (
                "ClayTablet" in first_item.content or "PopyCast" in first_item.content
            ):
                first_item.content = expected_content
                logger.info("Refreshed legacy seed content for system room: %s", room_id)
            continue

        room = models.Room(
            id=room_id,
            ttl="forever",
            is_system=True,
            is_public=True,
            is_readonly=True,
            last_activity=time.time(),
        )
        db.add(room)
        item = models.Item(
            id=str(uuid.uuid4()),
            room_id=room_id,
            item_type="text",
            content=expected_content,
            timestamp=time.time(),
        )
        db.add(item)
        logger.info("Seeded system room: %s", room_id)
    db.commit()
