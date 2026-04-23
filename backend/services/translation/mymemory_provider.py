import httpx
from .base_provider import TranslationProvider

MYMEMORY_URL = "https://api.mymemory.translated.net/get"
TIMEOUT = 5.0


class MyMemoryProvider(TranslationProvider):
    """MyMemory Translation API — free, no API key needed (1000 words/day)."""

    name = "mymemory"

    def is_configured(self) -> bool:
        return True  # Always available, no key required

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        langpair = f"{source_lang}|{target_lang}"

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(
                MYMEMORY_URL,
                params={"q": text, "langpair": langpair},
            )
            response.raise_for_status()
            data = response.json()

            translated = data.get("responseData", {}).get("translatedText", "")
            if not translated:
                raise RuntimeError("MyMemory returned empty translation")
            return translated
