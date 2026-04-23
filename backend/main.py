from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from routers import ocr, cards, settings, sentences
import models

# Create all database tables based on models
Base.metadata.create_all(bind=engine)

def create_initial_data():
    db = SessionLocal()
    # Create dummy user to avoid auth complexity in PoC
    user = db.query(models.User).filter(models.User.id == 1).first()
    if not user:
        user = models.User(username="test_user")
        db.add(user)
        db.commit()
    db.close()

create_initial_data()

app = FastAPI(title="OCR Translation & Flashcard API", version="1.0.0")

# Allow all origins to let frontend communicate freely during dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ocr.router, prefix="/api", tags=["OCR & AI"])
app.include_router(cards.router, prefix="/api", tags=["Cards & SRS"])
app.include_router(sentences.router, prefix="/api/sentences", tags=["Sentences"])
app.include_router(settings.router, prefix="/api", tags=["Settings"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend is running"}
