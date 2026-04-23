from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ProgressBase(BaseModel):
    interval: int
    repetitions: int
    ease_factor: float
    next_review: datetime

class Progress(ProgressBase):
    id: int
    card_id: int
    last_review: Optional[datetime] = None
    total_reviews: int = 0
    correct_reviews: int = 0
    wrong_reviews: int = 0
    success_rate: float = 0.0
    difficulty_score: float = 0.0
    level: str = "NEW"
    class Config:
        from_attributes = True

class CardBase(BaseModel):
    front: str
    back: str
    context: Optional[str] = None

class CardCreate(CardBase):
    pass

class Card(CardBase):
    id: int
    deck_id: int
    progress: Optional[Progress] = None
    class Config:
        from_attributes = True

class DeckBase(BaseModel):
    name: str

class DeckCreate(DeckBase):
    pass

class Deck(DeckBase):
    id: int
    owner_id: int
    share_id: Optional[str] = None
    cards: List[Card] = []
    class Config:
        from_attributes = True

class SentenceCardBase(BaseModel):
    front: str
    back: str

class SentenceCardCreate(SentenceCardBase):
    pass

class SentenceCard(SentenceCardBase):
    id: int
    deck_id: int
    class Config:
        from_attributes = True

class SentenceDeckBase(BaseModel):
    name: str

class SentenceDeckCreate(SentenceDeckBase):
    pass

class SentenceDeck(SentenceDeckBase):
    id: int
    owner_id: int
    cards: List[SentenceCard] = []
    class Config:
        from_attributes = True

class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int

class WordResult(BaseModel):
    text: str
    box: BoundingBox

class OCRResult(BaseModel):
    text: str
    box: BoundingBox
    words: List['WordResult'] = []

class TranslationRequest(BaseModel):
    text: str
    is_word: bool = False
    source_lang: str = "en"
    target_lang: str = "tr"
    provider: Optional[str] = None  # override user setting for this request

class TranslationResponse(BaseModel):
    translation: str
    meaning: Optional[str] = None
    example: Optional[str] = None
    provider_used: Optional[str] = None  # which provider served the translation

class UserSettingsResponse(BaseModel):
    translation_provider: str
    available_providers: List[str]
    class Config:
        from_attributes = True

class UserSettingsUpdate(BaseModel):
    translation_provider: str

class QuizReviewRequest(BaseModel):
    rating: str
    is_correct: bool

class MultipleChoiceCard(BaseModel):
    card_id: int
    question: str
    options: List[str]
    correct_index: int

class RecallCard(BaseModel):
    card_id: int
    prompt: str
    answer: str

class QuizSessionCreate(BaseModel):
    deck_id: int
    quiz_type: str

class QuizSessionResult(BaseModel):
    session_id: int
    deck_id: int
    quiz_type: str
    total_cards: int
    correct_answers: int
    wrong_answers: int
    accuracy: float
    hardest_cards: List[Card] = []
    easiest_cards: List[Card] = []
    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_cards: int
    new_cards: int
    learning_cards: int
    review_cards: int
    mastered_cards: int
    total_quizzes: int
    overall_success_rate: float
    most_difficult_cards: List[Card] = []
    best_known_cards: List[Card] = []
