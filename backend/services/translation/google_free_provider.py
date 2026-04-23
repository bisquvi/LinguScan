import asyncio
from functools import partial
from deep_translator import GoogleTranslator
from .base_provider import TranslationProvider


class GoogleFreeProvider(TranslationProvider):
    """Free Google Translate provider — no API key needed."""

    name = "google_free"

    def is_configured(self) -> bool:
        return True  # Always available, no key required

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        loop = asyncio.get_event_loop()
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        result = await loop.run_in_executor(None, partial(translator.translate, text))
        if not result:
            raise RuntimeError("Google Free returned empty translation")
        return result
