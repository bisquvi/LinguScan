from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from typing import List

router = APIRouter()

@router.post("/decks/", response_model=schemas.SentenceDeck)
def create_sentence_deck(deck: schemas.SentenceDeckCreate, db: Session = Depends(get_db)):
    db_deck = models.SentenceDeck(name=deck.name, owner_id=1)
    db.add(db_deck)
    db.commit()
    db.refresh(db_deck)
    return db_deck

@router.get("/decks/", response_model=List[schemas.SentenceDeck])
def read_sentence_decks(db: Session = Depends(get_db)):
    return db.query(models.SentenceDeck).all()

@router.get("/decks/{deck_id}", response_model=schemas.SentenceDeck)
def read_sentence_deck(deck_id: int, db: Session = Depends(get_db)):
    deck = db.query(models.SentenceDeck).filter(models.SentenceDeck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Sentence deck not found")
    return deck

@router.delete("/decks/{deck_id}", status_code=204)
def delete_sentence_deck(deck_id: int, db: Session = Depends(get_db)):
    deck = db.query(models.SentenceDeck).filter(models.SentenceDeck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Sentence deck not found")
    
    db.delete(deck)
    db.commit()

@router.post("/decks/{deck_id}/cards", response_model=schemas.SentenceCard)
def create_sentence_card(deck_id: int, card: schemas.SentenceCardCreate, db: Session = Depends(get_db)):
    deck = db.query(models.SentenceDeck).filter(models.SentenceDeck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Sentence deck not found")
    db_card = models.SentenceCard(**card.model_dump(), deck_id=deck_id)
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

@router.delete("/cards/{card_id}", status_code=204)
def delete_sentence_card(card_id: int, db: Session = Depends(get_db)):
    card = db.query(models.SentenceCard).filter(models.SentenceCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Sentence card not found")
        
    db.delete(card)
    db.commit()
