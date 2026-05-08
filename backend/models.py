import time
from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # E.g., google_12345
    email = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    provider = Column(String, nullable=False) # "google" or "yandex"
    created_at = Column(Float, default=time.time)

    rooms = relationship("Room", back_populates="owner")

class Room(Base):
    __tablename__ = "rooms"

    id = Column(String, primary_key=True, index=True)
    owner_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    password_hash = Column(String, nullable=True)
    ttl = Column(String, default="24h")
    is_readonly = Column(Boolean, default=False, nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)
    layout_order = Column(JSON, nullable=True)
    last_activity = Column(Float, default=time.time)

    owner = relationship("User", back_populates="rooms")
    # cascade="all, delete-orphan" guarantees orphaned items are removed
    items = relationship("Item", back_populates="room", cascade="all, delete-orphan")

class Item(Base):
    __tablename__ = "items"

    id = Column(String, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    item_type = Column(String, index=True)  # "text", "image", "audio", "file", "chat"
    timestamp = Column(Float, default=time.time)

    # For 'text' content
    content = Column(String, nullable=True)

    # For 'image', 'audio', and 'file' content
    filename = Column(String, nullable=True)
    url = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)  # File size in bytes

    # For 'chat' content
    author = Column(String, nullable=True)
    text = Column(String, nullable=True)

    room = relationship("Room", back_populates="items")
