from abc import ABC, abstractmethod


class TranslationProvider(ABC):
    """Abstract base class for all translation providers."""

    name: str = "base"

    @abstractmethod
    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translate *text* from *source_lang* to *target_lang*.

        Parameters
        ----------
        text : str
            The word or sentence to translate.
        source_lang : str
            ISO-639-1 language code (e.g. "en").
        target_lang : str
            ISO-639-1 language code (e.g. "tr").

        Returns
        -------
        str
            The translated text.

        Raises
        ------
        Exception
            On any failure (network, auth, quota, etc.).
        """
        ...
