import os
import httpx
from .base_provider import TranslationProvider

LIBRETRANSLATE_URL = os.getenv("LIBRETRANSLATE_URL", "http://localhost:5000")
LIBRETRANSLATE_API_KEY = os.getenv("LIBRETRANSLATE_API_KEY", "")
TIMEOUT = 3.0


class LibreTranslateProvider(TranslationProvider):
    """LibreTranslate (self-hosted) provider."""

    name = "libre"

    def is_configured(self) -> bool:
        # LibreTranslate can run without an API key when self-hosted
        return bool(LIBRETRANSLATE_URL)

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if not self.is_configured():
            raise RuntimeError("LIBRETRANSLATE_URL is not set")

        payload = {
            "q": text,
            "source": source_lang,
            "target": target_lang,
        }
        if LIBRETRANSLATE_API_KEY:
            payload["api_key"] = LIBRETRANSLATE_API_KEY

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                f"{LIBRETRANSLATE_URL}/translate",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["translatedText"]
