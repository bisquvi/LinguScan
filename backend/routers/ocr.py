import asyncio

from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session

from database import get_db
from services.ocr_service import process_image_for_ocr
from services.ai_service import get_meaning_and_example
from services.translation.translation_service import TranslationService
from schemas import OCRResult, TranslationRequest, TranslationResponse
from typing import List
import models

router = APIRouter()


@router.post("/process-image", response_model=List[OCRResult])
async def upload_image(file: UploadFile = File(...)):
    contents = await file.read()
    results = process_image_for_ocr(contents)
    return results


@router.post("/translate", response_model=TranslationResponse)
async def translate_text(req: TranslationRequest, db: Session = Depends(get_db)):
    
    provider_key = req.provider
    if not provider_key:
        settings = (
            db.query(models.UserSettings)
            .filter(models.UserSettings.user_id == 1)
            .first()
        )
        provider_key = settings.translation_provider if settings else "google_free"

    translation_coro = TranslationService.translate(
        text=req.text,
        source_lang=req.source_lang,
        target_lang=req.target_lang,
        provider_key=provider_key,
        db=db,
    )
    meaning_coro = get_meaning_and_example(req.text, req.is_word)

    try:
        (translated_text, provider_used), ai_result = await asyncio.gather(
            translation_coro,
            meaning_coro,
        )
    except Exception as e:
        print(f"[translate] Error: {e}")
        ai_result = await get_meaning_and_example(req.text, req.is_word)
        translated_text = ai_result.get("translation", req.text)
        provider_used = "ollama-fallback"

    return TranslationResponse(
        translation=translated_text,
        meaning=ai_result.get("meaning", ""),
        example=ai_result.get("example", ""),
        provider_used=provider_used,
    )
