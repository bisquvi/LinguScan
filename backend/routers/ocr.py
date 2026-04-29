import asyncio

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from database import get_db
import models
from routers.auth import get_optional_current_user
from schemas import OCRResult, TranslationRequest, TranslationResponse
from services.ai_service import get_meaning_and_example
from services.ocr_service import process_image_for_ocr
from services.translation.text_utils import normalize_text
from services.translation.translation_service import TranslationService

from typing import List, Optional

router = APIRouter()


@router.post("/process-image", response_model=List[OCRResult])
async def upload_image(file: UploadFile = File(...)):
    contents = await file.read()
    return process_image_for_ocr(contents)


@router.post("/translate", response_model=TranslationResponse)
async def translate_text(
    req: TranslationRequest,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_current_user),
):
    provider_key = req.provider
    if not provider_key:
        if current_user:
            settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == current_user.id).first()
            provider_key = settings.translation_provider if settings else "google_free"
        else:
            provider_key = "google_free"

    normalized = normalize_text(req.text)
    cached = (
        db.query(models.TranslationCache)
        .filter(
            models.TranslationCache.source_text == normalized,
            models.TranslationCache.source_lang == req.source_lang,
            models.TranslationCache.target_lang == req.target_lang,
            models.TranslationCache.provider == provider_key,
        )
        .first()
    )

    if cached and cached.meaning:
        return TranslationResponse(
            translation=cached.translation,
            meaning=cached.meaning,
            example=cached.example or "",
            provider_used=cached.provider,
        )

    translation_coro = TranslationService.translate(
        text=req.text,
        source_lang=req.source_lang,
        target_lang=req.target_lang,
        provider_key=provider_key,
        db=db,
    )
    meaning_coro = get_meaning_and_example(req.text, req.is_word)

    try:
        (translated_text, provider_used), ai_result = await asyncio.gather(translation_coro, meaning_coro)
    except Exception as exc:
        print(f"[translate] Error: {exc}")
        ai_result = await get_meaning_and_example(req.text, req.is_word)
        translated_text = ai_result.get("translation", req.text)
        provider_used = "ollama-fallback"

    cached = (
        db.query(models.TranslationCache)
        .filter(
            models.TranslationCache.source_text == normalized,
            models.TranslationCache.source_lang == req.source_lang,
            models.TranslationCache.target_lang == req.target_lang,
            models.TranslationCache.provider == provider_used,
        )
        .first()
    )
    if cached:
        cached.meaning = ai_result.get("meaning", "")
        cached.example = ai_result.get("example", "")
        db.commit()

    return TranslationResponse(
        translation=translated_text,
        meaning=ai_result.get("meaning", ""),
        example=ai_result.get("example", ""),
        provider_used=provider_used,
    )
