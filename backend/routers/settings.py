from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from services.translation import PROVIDER_REGISTRY

router = APIRouter()


@router.get("/settings", response_model=schemas.UserSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Return the current user's translation settings."""
    settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == 1).first()
    provider = settings.translation_provider if settings else "google"
    return schemas.UserSettingsResponse(
        translation_provider=provider,
        available_providers=list(PROVIDER_REGISTRY.keys()),
    )


@router.put("/settings", response_model=schemas.UserSettingsResponse)
def update_settings(payload: schemas.UserSettingsUpdate, db: Session = Depends(get_db)):
    """Update the translation provider preference."""
    if payload.translation_provider not in PROVIDER_REGISTRY:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown provider '{payload.translation_provider}'. "
                   f"Available: {list(PROVIDER_REGISTRY.keys())}",
        )

    settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == 1).first()
    if not settings:
        settings = models.UserSettings(user_id=1, translation_provider=payload.translation_provider)
        db.add(settings)
    else:
        settings.translation_provider = payload.translation_provider

    db.commit()
    db.refresh(settings)

    return schemas.UserSettingsResponse(
        translation_provider=settings.translation_provider,
        available_providers=list(PROVIDER_REGISTRY.keys()),
    )
