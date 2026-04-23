import os
import json
import httpx
from .base_provider import TranslationProvider

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
TIMEOUT = 30.0  # Ollama can be slow on CPU; generous timeout as last-resort fallback


class OllamaTranslateProvider(TranslationProvider):
    """Ollama (local LLM) translation-only provider — used as final fallback."""

    name = "ollama"

    def is_configured(self) -> bool:
        return bool(OLLAMA_URL)

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        prompt = (
            f"Translate the following word or sentence from {source_lang} to {target_lang}. "
            "Return only the translation, nothing else.\n\n"
            f"{text}"
        )

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": "llama3",
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "top_p": 0.9,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
            result = data.get("response", "").strip()
            if not result:
                raise RuntimeError("Ollama returned empty translation")

            # Strip surrounding quotes if the model added them
            if (result.startswith('"') and result.endswith('"')) or \
               (result.startswith("'") and result.endswith("'")):
                result = result[1:-1].strip()

            return result
