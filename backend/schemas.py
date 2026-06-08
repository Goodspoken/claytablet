"""Pydantic request schemas for the ClayTablet API."""
from typing import Optional

from pydantic import BaseModel, Field


class TextItem(BaseModel):
    content: str = Field(..., max_length=100_000)


class ChatItem(BaseModel):
    author: str = Field(..., max_length=100)
    text: str = Field(..., max_length=5000)


class RoomSettings(BaseModel):
    ttl: str = Field("24h", pattern=r"^(10m|1h|24h|7d|forever)$")
    password: Optional[str] = Field(None, max_length=100)
    is_readonly: bool = False
    is_public: bool = False


class OrderSettings(BaseModel):
    order: list[str]


class PasswordVerification(BaseModel):
    password: str
