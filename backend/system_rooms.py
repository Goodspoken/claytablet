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
    },
    {
        "id": "_about",
        "emoji": "📖",
        "title_ru": "О проекте",
        "title_en": "About",
        "description_ru": "Что такое ClayTablet, идея и принципы",
        "description_en": "What ClayTablet is — idea and principles",
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
