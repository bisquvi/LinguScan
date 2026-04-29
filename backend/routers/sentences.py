from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from routers.auth import get_current_user

from typing import List

router = APIRouter()


def get_sentence_deck_or_404(db: Session, deck_id: int, owner_id: int):
    deck = (
        db.query(models.SentenceDeck)
        .filter(models.SentenceDeck.id == deck_id, models.SentenceDeck.owner_id == owner_id)
        .first()
    )
    if not deck:
        raise HTTPException(status_code=404, detail="Sentence deck not found")
    return deck


def get_sentence_card_or_404(db: Session, card_id: int, owner_id: int):
    card = (
        db.query(models.SentenceCard)
        .join(models.SentenceDeck, models.SentenceCard.deck_id == models.SentenceDeck.id)
        .filter(models.SentenceCard.id == card_id, models.SentenceDeck.owner_id == owner_id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Sentence card not found")
    return card


@router.post("/decks/", response_model=schemas.SentenceDeck)
def create_sentence_deck(
    deck: schemas.SentenceDeckCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_deck = models.SentenceDeck(name=deck.name, owner_id=current_user.id)
    db.add(db_deck)
    db.commit()
    db.refresh(db_deck)
    return db_deck


@router.get("/decks/", response_model=List[schemas.SentenceDeck])
def read_sentence_decks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.SentenceDeck).filter(models.SentenceDeck.owner_id == current_user.id).all()


@router.get("/decks/{deck_id}", response_model=schemas.SentenceDeck)
def read_sentence_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return get_sentence_deck_or_404(db, deck_id, current_user.id)


@router.delete("/decks/{deck_id}", status_code=204)
def delete_sentence_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    deck = get_sentence_deck_or_404(db, deck_id, current_user.id)
    db.delete(deck)
    db.commit()


@router.post("/decks/{deck_id}/cards", response_model=schemas.SentenceCard)
def create_sentence_card(
    deck_id: int,
    card: schemas.SentenceCardCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_sentence_deck_or_404(db, deck_id, current_user.id)
    db_card = models.SentenceCard(**card.model_dump(), deck_id=deck_id)
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card


@router.delete("/cards/{card_id}", status_code=204)
def delete_sentence_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    card = get_sentence_card_or_404(db, card_id, current_user.id)
    db.delete(card)
    db.commit()
