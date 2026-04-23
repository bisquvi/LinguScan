import os
import httpx
from .base_provider import TranslationProvider

YANDEX_API_KEY = os.getenv("YANDEX_TRANSLATE_API_KEY", "")
YANDEX_URL = "https://translate.api.cloud.yandex.net/translate/v2/translate"
TIMEOUT = 3.0


class YandexTranslateProvider(TranslationProvider):
    """Yandex Cloud Translate API provider."""

    name = "yandex"

    def is_configured(self) -> bool:
        return bool(YANDEX_API_KEY)

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if not self.is_configured():
            raise RuntimeError("YANDEX_TRANSLATE_API_KEY is not set")

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                YANDEX_URL,
                headers={"Authorization": f"Api-Key {YANDEX_API_KEY}"},
                json={
                    "sourceLanguageCode": source_lang,
                    "targetLanguageCode": target_lang,
                    "texts": [text],
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["translations"][0]["text"]
