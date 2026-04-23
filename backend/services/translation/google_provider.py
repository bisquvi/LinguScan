import os
import httpx
from .base_provider import TranslationProvider

GOOGLE_TRANSLATE_API_KEY = os.getenv("GOOGLE_TRANSLATE_API_KEY", "")
GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"
TIMEOUT = 3.0


class GoogleTranslateProvider(TranslationProvider):
    """Google Cloud Translation API v2 provider."""

    name = "google"

    def is_configured(self) -> bool:
        return bool(GOOGLE_TRANSLATE_API_KEY)

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if not self.is_configured():
            raise RuntimeError("GOOGLE_TRANSLATE_API_KEY is not set")

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                GOOGLE_TRANSLATE_URL,
                params={"key": GOOGLE_TRANSLATE_API_KEY},
                json={
                    "q": text,
                    "source": source_lang,
                    "target": target_lang,
                    "format": "text",
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["data"]["translations"][0]["translatedText"]
