import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
import enum

class CardLevel(str, enum.Enum):
    NEW = "NEW"
    LEARNING = "LEARNING"
    REVIEW = "REVIEW"
    MASTERED = "MASTERED"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String, nullable=True)
    token = Column(String, nullable=True, index=True)
    decks = relationship("Deck", back_populates="owner")
    sentence_decks = relationship("SentenceDeck", back_populates="owner")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    quiz_sessions = relationship("QuizSession", back_populates="user", cascade="all, delete")

class Deck(Base):
    __tablename__ = "decks"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    share_id = Column(String, unique=True, index=True, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="decks")
    cards = relationship("Card", back_populates="deck", cascade="all, delete")

class Card(Base):
    __tablename__ = "cards"
    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("decks.id"))
    front = Column(Text, nullable=False)  # English word or sentence
    back = Column(Text, nullable=False)   # Turkish translation
    context = Column(Text, nullable=True) # Full meaning or context explanation
    
    deck = relationship("Deck", back_populates="cards")
    progress = relationship("Progress", back_populates="card", uselist=False, cascade="all, delete")

class Progress(Base):
    __tablename__ = "progress"
    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), unique=True)
    
    # SM-2 Algorithm fields
    interval = Column(Integer, default=0)
    repetitions = Column(Integer, default=0)
    ease_factor = Column(Float, default=2.5)
    next_review = Column(DateTime, default=datetime.datetime.utcnow)

    # Extended tracking fields
    last_review = Column(DateTime, nullable=True)
    total_reviews = Column(Integer, default=0)
    correct_reviews = Column(Integer, default=0)
    wrong_reviews = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    difficulty_score = Column(Float, default=0.0)
    level = Column(SAEnum(CardLevel), default=CardLevel.NEW)
    card = relationship("Card", back_populates="progress")

class SentenceDeck(Base):
    __tablename__ = "sentence_decks"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="sentence_decks")
    cards = relationship("SentenceCard", back_populates="deck", cascade="all, delete")

class SentenceCard(Base):
    __tablename__ = "sentence_cards"
    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("sentence_decks.id"))
    front = Column(Text, nullable=False)  # Original sentence
    back = Column(Text, nullable=False)   # Translation
    
    deck = relationship("SentenceDeck", back_populates="cards")

class QuizSession(Base):
    __tablename__ = "quiz_sessions"
    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("decks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    quiz_type = Column(String, default="recall")  # "recall" or "multiple_choice"
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    total_cards = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    wrong_answers = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)

    user = relationship("User", back_populates="quiz_sessions")
    results = relationship("QuizResult", back_populates="session", cascade="all, delete")

class QuizResult(Base):
    __tablename__ = "quiz_results"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("quiz_sessions.id"))
    card_id = Column(Integer, ForeignKey("cards.id"))
    is_correct = Column(Integer, default=0)  # 1 = correct, 0 = wrong
    rating = Column(String, nullable=True)   # "again", "mid", "good", "easy"

    session = relationship("QuizSession", back_populates="results")
    card = relationship("Card")

class TranslationCache(Base):
    __tablename__ = "translation_cache"
    __table_args__ = (
        UniqueConstraint("source_text", "source_lang", "target_lang", "provider", name="uq_translation_lookup"),
    )

    id = Column(Integer, primary_key=True, index=True)
    source_text = Column(String, nullable=False, index=True)   # normalized (lowercase, stripped)
    source_lang = Column(String(10), nullable=False)
    target_lang = Column(String(10), nullable=False)
    provider = Column(String(50), nullable=False)
    translation = Column(Text, nullable=False)
    meaning = Column(Text, nullable=True)    # Cached Ollama meaning
    example = Column(Text, nullable=True)    # Cached Ollama example
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    translation_provider = Column(String(50), default="google_free")

    user = relationship("User", back_populates="settings")
