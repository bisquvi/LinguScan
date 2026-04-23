from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models
import schemas
from services.srs_service import process_review
from typing import List
import random
import datetime

router = APIRouter()

# ── Deck endpoints (unchanged) ─────────────────────────────────────────────────

@router.post("/decks/", response_model=schemas.Deck)
def create_deck(deck: schemas.DeckCreate, db: Session = Depends(get_db)):
    db_deck = models.Deck(name=deck.name, owner_id=1)
    db.add(db_deck)
    db.commit()
    db.refresh(db_deck)
    return db_deck

@router.get("/decks/", response_model=List[schemas.Deck])
def read_decks(db: Session = Depends(get_db)):
    return db.query(models.Deck).all()

@router.get("/decks/{deck_id}", response_model=schemas.Deck)
def read_deck(deck_id: int, db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck

@router.delete("/decks/{deck_id}", status_code=204)
def delete_deck(deck_id: int, db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    # Delete related quiz sessions and their results
    sessions_query = db.query(models.QuizSession.id).filter(models.QuizSession.deck_id == deck_id)
    db.query(models.QuizResult).filter(models.QuizResult.session_id.in_(sessions_query)).delete(synchronize_session=False)
    db.query(models.QuizSession).filter(models.QuizSession.deck_id == deck_id).delete(synchronize_session=False)
    
    db.delete(deck)
    db.commit()

@router.post("/decks/{deck_id}/cards", response_model=schemas.Card)
def create_card(deck_id: int, card: schemas.CardCreate, db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    db_card = models.Card(**card.model_dump(), deck_id=deck_id)
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    db_progress = models.Progress(card_id=db_card.id)
    db.add(db_progress)
    db.commit()
    return db_card

@router.delete("/cards/{card_id}", status_code=204)
def delete_card(card_id: int, db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
        
    # Delete related quiz results first
    db.query(models.QuizResult).filter(models.QuizResult.card_id == card_id).delete(synchronize_session=False)
    
    db.delete(card)
    db.commit()

# ── Legacy review endpoint (kept for backwards compatibility) ─────────────────

@router.post("/cards/{card_id}/review")
def review_card_legacy(card_id: int, quality: int, db: Session = Depends(get_db)):
    """Legacy endpoint: quality 0-5 integer."""
    db_progress = db.query(models.Progress).filter(models.Progress.card_id == card_id).first()
    if not db_progress:
        raise HTTPException(status_code=404, detail="Card progress not found")
    rating_map = {0: "again", 1: "again", 2: "mid", 3: "mid", 4: "good", 5: "easy"}
    rating = rating_map.get(quality, "mid")
    updates = process_review(db_progress, rating, is_correct=(quality >= 3))
    for key, value in updates.items():
        setattr(db_progress, key, value)
    db.commit()
    db.refresh(db_progress)
    return db_progress

# ── Quiz session endpoints ─────────────────────────────────────────────────────

@router.post("/quiz/session/start")
def start_quiz_session(payload: schemas.QuizSessionCreate, db: Session = Depends(get_db)):
    """Creates a quiz session and returns cards formatted for the chosen quiz type."""
    deck = db.query(models.Deck).filter(models.Deck.id == payload.deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    if not deck.cards:
        raise HTTPException(status_code=400, detail="No cards in this deck")

    session = models.QuizSession(
        deck_id=payload.deck_id,
        user_id=1,
        quiz_type=payload.quiz_type,
        total_cards=len(deck.cards),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    cards = deck.cards

    if payload.quiz_type == "multiple_choice":
        # Collect all backs from user's decks as distractor pool
        all_cards = db.query(models.Card).all()
        all_backs = list({c.back for c in all_cards})

        quiz_cards = []
        for card in cards:
            distractors = [b for b in all_backs if b != card.back]
            if len(distractors) >= 3:
                chosen = random.sample(distractors, 3)
            else:
                chosen = distractors + ["—"] * (3 - len(distractors))

            options = chosen + [card.back]
            random.shuffle(options)
            correct_index = options.index(card.back)

            quiz_cards.append({
                "card_id": card.id,
                "question": card.front,
                "options": options,
                "correct_index": correct_index,
            })

        return {"session_id": session.id, "quiz_type": "multiple_choice", "cards": quiz_cards}

    else:  # recall
        quiz_cards = [
            {"card_id": c.id, "prompt": c.front, "answer": c.back}
            for c in cards
        ]
        return {"session_id": session.id, "quiz_type": "recall", "cards": quiz_cards}


@router.post("/quiz/session/{session_id}/review/{card_id}")
def review_quiz_card(
    session_id: int,
    card_id: int,
    payload: schemas.QuizReviewRequest,
    db: Session = Depends(get_db),
):
    """Submit a single card review within a quiz session."""
    session = db.query(models.QuizSession).filter(models.QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    progress = db.query(models.Progress).filter(models.Progress.card_id == card_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Card progress not found")

    updates = process_review(progress, payload.rating, payload.is_correct)
    for key, value in updates.items():
        setattr(progress, key, value)

    result = models.QuizResult(
        session_id=session_id,
        card_id=card_id,
        is_correct=1 if payload.is_correct else 0,
        rating=payload.rating,
    )
    db.add(result)
    db.commit()

    return {"status": "ok", "level": updates["level"], "next_review": updates["next_review"]}


@router.post("/quiz/session/{session_id}/finish")
def finish_quiz_session(session_id: int, db: Session = Depends(get_db)):
    """Finalises the session and returns result summary."""
    session = db.query(models.QuizSession).filter(models.QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    results = db.query(models.QuizResult).filter(models.QuizResult.session_id == session_id).all()
    correct = sum(r.is_correct for r in results)
    wrong = len(results) - correct
    accuracy = round(correct / len(results) * 100, 1) if results else 0.0

    session.finished_at = datetime.datetime.utcnow()
    session.correct_answers = correct
    session.wrong_answers = wrong
    session.accuracy = accuracy
    db.commit()

    # Hardest cards in session (highest difficulty_score)
    reviewed_card_ids = [r.card_id for r in results]
    progresses = (
        db.query(models.Progress)
        .filter(models.Progress.card_id.in_(reviewed_card_ids))
        .order_by(models.Progress.difficulty_score.desc())
        .limit(3)
        .all()
    )
    hardest = [db.query(models.Card).get(p.card_id) for p in progresses]

    easiest_progresses = (
        db.query(models.Progress)
        .filter(models.Progress.card_id.in_(reviewed_card_ids))
        .order_by(models.Progress.difficulty_score.asc())
        .limit(3)
        .all()
    )
    easiest = [db.query(models.Card).get(p.card_id) for p in easiest_progresses]

    return {
        "session_id": session_id,
        "deck_id": session.deck_id,
        "quiz_type": session.quiz_type,
        "total_cards": session.total_cards,
        "correct_answers": correct,
        "wrong_answers": wrong,
        "accuracy": accuracy,
        "hardest_cards": [{"id": c.id, "front": c.front, "back": c.back} for c in hardest if c],
        "easiest_cards": [{"id": c.id, "front": c.front, "back": c.back} for c in easiest if c],
    }


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    all_progresses = db.query(models.Progress).all()

    total_cards = len(all_progresses)
    new_cards = sum(1 for p in all_progresses if p.level == "NEW")
    learning_cards = sum(1 for p in all_progresses if p.level == "LEARNING")
    review_cards = sum(1 for p in all_progresses if p.level == "REVIEW")
    mastered_cards = sum(1 for p in all_progresses if p.level == "MASTERED")

    total_quizzes = db.query(models.QuizSession).count()

    rates = [p.success_rate for p in all_progresses if p.total_reviews > 0]
    overall_success_rate = round(sum(rates) / len(rates) * 100, 1) if rates else 0.0

    difficult = (
        db.query(models.Progress)
        .filter(models.Progress.total_reviews > 0)
        .order_by(models.Progress.difficulty_score.desc())
        .limit(5)
        .all()
    )
    easiest = (
        db.query(models.Progress)
        .filter(models.Progress.total_reviews > 0)
        .order_by(models.Progress.difficulty_score.asc())
        .limit(5)
        .all()
    )

    def card_summary(p):
        c = db.query(models.Card).get(p.card_id)
        return {"id": c.id, "front": c.front, "back": c.back} if c else None

    return {
        "total_cards": total_cards,
        "new_cards": new_cards,
        "learning_cards": learning_cards,
        "review_cards": review_cards,
        "mastered_cards": mastered_cards,
        "total_quizzes": total_quizzes,
        "overall_success_rate": overall_success_rate,
        "most_difficult_cards": [card_summary(p) for p in difficult if card_summary(p)],
        "best_known_cards": [card_summary(p) for p in easiest if card_summary(p)],
    }
