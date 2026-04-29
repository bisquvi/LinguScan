import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from routers import ocr, cards, settings, sentences, auth
import models
from sqlalchemy import text

Base.metadata.create_all(bind=engine)


def ensure_auth_columns():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR"))
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS token VARCHAR"))
        db.commit()
    except Exception as exc:
        db.rollback()
        print("User auth column migration failed:", exc)
    finally:
        db.close()


def seed_demo_user_if_enabled():
    if os.getenv("SEED_DEMO_USER", "").lower() != "true":
        return

    from routers.auth import hash_password

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == "test_user").first()
        if user:
            return

        user = models.User(username="test_user", password=hash_password("password"))
        db.add(user)
        db.commit()
    finally:
        db.close()


def get_allowed_origins():
    configured_origins = os.getenv("CORS_ALLOW_ORIGINS")
    if configured_origins:
        origins = [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
        if origins:
            return origins

    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ]


ensure_auth_columns()
seed_demo_user_if_enabled()

app = FastAPI(title="OCR Translation & Flashcard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(ocr.router, prefix="/api", tags=["OCR & AI"])
app.include_router(cards.router, prefix="/api", tags=["Cards & SRS"])
app.include_router(sentences.router, prefix="/api/sentences", tags=["Sentences"])
app.include_router(settings.router, prefix="/api", tags=["Settings"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend is running"}
