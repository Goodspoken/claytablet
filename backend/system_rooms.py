"""Built-in system rooms metadata + seeding logic."""
import logging
import time
import uuid

from sqlalchemy.orm import Session

import models

logger = logging.getLogger("dubtab")

SYSTEM_ROOMS = [
    {
        "id": "_help",
        "emoji": "❓",
        "title_ru": "Помощь",
        "title_en": "Help",
        "description_ru": "FAQ и инструкции по использованию DubTab",
        "description_en": "FAQ and how-to guides for DubTab",
    },
    {
        "id": "_about",
        "emoji": "📖",
        "title_ru": "О проекте",
        "title_en": "About",
        "description_ru": "Что такое DubTab, идея и принципы",
        "description_en": "What DubTab is — idea and principles",
    },
    {
        "id": "_me",
        "emoji": "👤",
        "title_ru": "Об авторе",
        "title_en": "About the author",
        "description_ru": "Кто делает DubTab",
        "description_en": "Who is building DubTab",
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


def seed_system_rooms(db: Session) -> None:
    """Create system rooms if they don't exist yet."""
    for room_meta in SYSTEM_ROOMS:
        room_id = room_meta["id"]
        existing = db.query(models.Room).filter(models.Room.id == room_id).first()
        if existing:
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
            content=(
                f"{room_meta['emoji']} **{room_meta['title_ru']} / {room_meta['title_en']}**\n\n"
                f"🇷🇺 {room_meta['description_ru']}\n"
                f"🇬🇧 {room_meta['description_en']}"
            ),
            timestamp=time.time(),
        )
        db.add(item)
        logger.info("Seeded system room: %s", room_id)
    db.commit()
