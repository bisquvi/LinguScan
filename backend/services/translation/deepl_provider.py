import os
import httpx
from .base_provider import TranslationProvider

DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "")
DEEPL_URL = "https://api-free.deepl.com/v2/translate"
TIMEOUT = 3.0


class DeepLProvider(TranslationProvider):
    """DeepL API (free tier) provider."""

    name = "deepl"

    def is_configured(self) -> bool:
        return bool(DEEPL_API_KEY)

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if not self.is_configured():
            raise RuntimeError("DEEPL_API_KEY is not set")

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                DEEPL_URL,
                headers={"Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}"},
                data={
                    "text": text,
                    "source_lang": source_lang.upper(),
                    "target_lang": target_lang.upper(),
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["translations"][0]["text"]
