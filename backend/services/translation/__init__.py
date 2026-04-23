from .base_provider import TranslationProvider
from .google_provider import GoogleTranslateProvider
from .google_free_provider import GoogleFreeProvider
from .deepl_provider import DeepLProvider
from .yandex_provider import YandexTranslateProvider
from .libre_provider import LibreTranslateProvider
from .mymemory_provider import MyMemoryProvider
from .ollama_provider import OllamaTranslateProvider

# Provider registry — maps setting keys to provider classes
PROVIDER_REGISTRY = {
    "google_free": GoogleFreeProvider,      # Free, no API key
    "mymemory": MyMemoryProvider,           # Free, no API key
    "google": GoogleTranslateProvider,      # Requires API key
    "deepl": DeepLProvider,                 # Requires API key
    "yandex": YandexTranslateProvider,      # Requires API key
    "libre": LibreTranslateProvider,        # Requires running instance
    "ollama": OllamaTranslateProvider,      # Local LLM fallback
}

# Default fallback chain order (free providers first)
DEFAULT_FALLBACK_CHAIN = ["google_free", "mymemory", "google", "yandex", "libre", "ollama"]

# TranslationService is NOT imported here to avoid circular imports.
# Import it directly: from services.translation.translation_service import TranslationService

__all__ = [
    "TranslationProvider",
    "GoogleFreeProvider",
    "GoogleTranslateProvider",
    "DeepLProvider",
    "YandexTranslateProvider",
    "LibreTranslateProvider",
    "MyMemoryProvider",
    "OllamaTranslateProvider",
    "PROVIDER_REGISTRY",
    "DEFAULT_FALLBACK_CHAIN",
]
