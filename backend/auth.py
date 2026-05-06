import os
import time
import jwt
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from fastapi_sso.sso.google import GoogleSSO
from fastapi_sso.sso.yandex import YandexSSO

import database
import models

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 30

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
YANDEX_CLIENT_ID = os.getenv("YANDEX_CLIENT_ID", "")
YANDEX_CLIENT_SECRET = os.getenv("YANDEX_CLIENT_SECRET", "")

HOST_URL = os.getenv("HOST_URL", "http://localhost:5173") 

_allow_insecure = os.getenv("ENVIRONMENT", "production") != "production"

google_sso = GoogleSSO(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    f"{HOST_URL}/api/auth/google/callback",
    allow_insecure_http=_allow_insecure
)

yandex_sso = YandexSSO(
    YANDEX_CLIENT_ID,
    YANDEX_CLIENT_SECRET,
    f"{HOST_URL}/api/auth/yandex/callback",
    allow_insecure_http=_allow_insecure
)

def create_jwt_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": time.time() + (JWT_EXPIRATION_DAYS * 24 * 60 * 60)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user_id(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    if not token:
        token = request.cookies.get("claytablet_token")

    if not token:
        return None

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None

def get_current_user_id_sync(token: str) -> Optional[str]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None

@router.get("/google/login")
async def google_login():
    with google_sso:
        return await google_sso.get_login_redirect()

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(database.get_db)):
    with google_sso:
        user_info = await google_sso.verify_and_process(request)
    return handle_sso_login(user_info, "google", db)

@router.get("/yandex/login")
async def yandex_login():
    with yandex_sso:
        return await yandex_sso.get_login_redirect()

@router.get("/yandex/callback")
async def yandex_callback(request: Request, db: Session = Depends(database.get_db)):
    with yandex_sso:
        user_info = await yandex_sso.verify_and_process(request)
    return handle_sso_login(user_info, "yandex", db)

def handle_sso_login(user_info, provider: str, db: Session):
    if not user_info:
        raise HTTPException(status_code=401, detail="SSO authentication failed")
    
    user_id = f"{provider}_{user_info.id}"
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        user = models.User(
            id=user_id,
            email=user_info.email,
            name=user_info.display_name,
            picture=user_info.picture,
            provider=provider
        )
        db.add(user)
    else:
        user.name = user_info.display_name
        user.picture = user_info.picture
    
    db.commit()

    token = create_jwt_token(user_id)
    
    # We redirect to / without the token in the URL for security. 
    # The frontend reads the httponly cookie 'claytablet_token' (which is already set below)
    # or a regular cookie if we were doing JS reads, but httponly is safer.
    # Actually, the frontend might need to know they logged in, but we can check /api/auth/me
    response = RedirectResponse(url="/")
    response.set_cookie("claytablet_token", token, max_age=JWT_EXPIRATION_DAYS*24*60*60, httponly=True, samesite="lax")
    return response

@router.get("/me")
async def get_me(request: Request, db: Session = Depends(database.get_db)):
    user_id = get_current_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "provider": user.provider
    }

@router.get("/me/rooms")
async def get_my_rooms(request: Request, db: Session = Depends(database.get_db)):
    user_id = get_current_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    rooms = db.query(models.Room).filter(models.Room.owner_id == user_id).order_by(models.Room.last_activity.desc()).all()
    return [{"id": r.id, "ttl": r.ttl, "last_activity": r.last_activity} for r in rooms]

@router.post("/logout")
async def logout():
    response = Response(content='{"status":"ok"}', media_type="application/json")
    response.delete_cookie("claytablet_token")
    return response

@router.get("/token")
async def get_token(request: Request):
    """Возвращает текущий JWT токен — для использования с CLI."""
    token = request.cookies.get("claytablet_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    if not token:
        raise HTTPException(status_code=401, detail="Не авторизован. Сначала войди на claytablet.online")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub", "")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Токен невалиден")
    return {
        "token": token,
        "user_id": user_id,
        "hint": "Скопируй token и вставь в: claytab config --token <token>"
    }
