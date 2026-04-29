import re
import unicodedata


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text).strip().lower()
    if " " not in text:
        text = re.sub(r"^[^\w]+|[^\w]+$", "", text)
    return text
