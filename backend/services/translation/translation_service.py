from typing import List, Optional

from sqlalchemy.orm import Session

from .base_provider import TranslationProvider
from . import PROVIDER_REGISTRY, DEFAULT_FALLBACK_CHAIN
from .text_utils import normalize_text


def _get_provider_instance(provider_key: str) -> Optional[TranslationProvider]:
    """Instantiate a provider by key, returning None if not in the registry."""
    cls = PROVIDER_REGISTRY.get(provider_key)
    if cls is None:
        return None
    return cls()


def _build_fallback_chain(selected: str) -> List[str]:
    """
    Build the ordered fallback chain starting with the selected provider,
    then appending any remaining defaults (excluding duplicates).
    """
    chain = [selected]
    for key in DEFAULT_FALLBACK_CHAIN:
        if key not in chain:
            chain.append(key)
    return chain


class TranslationService:
    """
    Orchestrates translation requests through:
    1. Cache lookup (case-insensitive, normalized)
    2. Selected provider call
    3. Fallback chain on failure
    4. Cache write on success
    """

    @staticmethod
    async def translate(
        text: str,
        source_lang: str,
        target_lang: str,
        provider_key: str,
        db: Session,
    ) -> tuple[str, str]:
        """
        Translate *text* using the cache-first strategy with fallback.

        Returns
        -------
        tuple[str, str]
            (translated_text, provider_name_used)
        """
        from models import TranslationCache  # avoid circular import

        normalized = normalize_text(text)

        # ── 1. Cache lookup ──────────────────────────────────────────
        cached = (
            db.query(TranslationCache)
            .filter(
                TranslationCache.source_text == normalized,
                TranslationCache.source_lang == source_lang,
                TranslationCache.target_lang == target_lang,
                TranslationCache.provider == provider_key,
            )
            .first()
        )
        if cached:
            print(f"[TranslationService] Cache HIT for '{normalized}' ({cached.provider})")
            return cached.translation, cached.provider

        # ── 2. Call providers with fallback ───────────────────────────
        chain = _build_fallback_chain(provider_key)
        last_error = None

        for key in chain:
            provider = _get_provider_instance(key)
            if provider is None:
                continue

            # Skip providers that are not configured (missing API key)
            if hasattr(provider, "is_configured") and not provider.is_configured():
                print(f"[TranslationService] Skipping '{key}': not configured")
                continue

            try:
                print(f"[TranslationService] Trying provider '{key}' for '{normalized}'")
                result = await provider.translate(text, source_lang, target_lang)

                # ── 3. Cache write ───────────────────────────────────
                cache_entry = TranslationCache(
                    source_text=normalized,
                    source_lang=source_lang,
                    target_lang=target_lang,
                    provider=key,
                    translation=result,
                )
                db.add(cache_entry)
                try:
                    db.commit()
                except Exception:
                    db.rollback()  # duplicate key race condition — harmless

                return result, key

            except Exception as e:
                last_error = e
                print(f"[TranslationService] Provider '{key}' failed: {e}")
                continue

        # All providers exhausted
        raise RuntimeError(
            f"All translation providers failed for '{text}'. Last error: {last_error}"
        )
