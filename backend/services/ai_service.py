import httpx
import os
import json
import re

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

async def get_translation_and_meaning(text: str, is_word: bool = False):
    """
    Calls local Ollama Llama 3 model to get translation and contextual meaning.
    Requires Llama 3 model to be pulled beforehand.

    DEPRECATED: Use get_meaning_and_example() + TranslationService.translate() instead.
    """
    if is_word:
        prompt = (
            "Sen profesyonel bir Türk sözlük editörüsün. "
            "Aşağıdaki İngilizce kelimeyi analiz et ve YALNIZCA şu üç anahtarı içeren bir JSON objesi döndür: "
            "'translation', 'meaning' ve 'example'.\n"
            "KURALLAR:\n"
            "- translation ve meaning alanları YALNIZCA TÜRKÇE olmalıdır. Hiçbir İngilizce kelime kullanma.\n"
            "- translation: Kelimenin en yaygın 1-3 Türkçe karşılığı, ' / ' ile ayrılmış, sade liste halinde.\n"
            "- meaning: Kelimenin kısa Türkçe açıklaması. "
            "ÖNEMLİ: Cümleye ASLA 'İsim', 'Fiil', 'Sıfat', 'Zarf', 'Bağlaç' gibi sözcük türü etiketleriyle BAŞLAMA. "
            "Doğrudan açıklamaya başla. Kelimenin ne anlama geldiğini düzgün Türkçe ile 1-2 cümleyle açıkla. "
            "Asla İngilizce kelime kullanma.\n"
            "- example: Bu kelimeyi kullanan ÇOCUKLAR İÇİN bile anlaşılabilir seviyede olabildiğince KISA ve BASİT "
            "bir İngilizce örnek cümle. Sadece İngilizce. Tek cümle. Nokta ile bitir.\n"
            f"İngilizce kelime: '{text}'"
        )
    else:
        prompt = (
            "Sen profesyonel bir çevirmensin. "
            "Aşağıdaki İngilizce cümleyi Türkçeye çevir ve YALNIZCA şu iki anahtarı içeren bir JSON objesi döndür: "
            "'translation' ve 'meaning'.\n"
            "KURALLAR:\n"
            "- Tüm çıktı YALNIZCA TÜRKÇE olmalıdır. Hiçbir İngilizce kelime veya etiket kullanma.\n"
            "- translation: Cümlenin doğal ve akıcı Türkçe çevirisi.\n"
            "- meaning: Cümlenin bağlamını veya nüansını açıklayan kısa bir Türkçe yorum. Tek cümle.\n"
            f"İngilizce cümle: '{text}'"
        )
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": "llama3",
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "top_p": 0.9,
                        "repeat_penalty": 1.1
                    }
                },
                timeout=60.0 # Generation might take a while on CPU
            )
            response.raise_for_status()
            data = response.json()
            
            result_text = data.get("response", "{}")
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                # Try to recover the first JSON object if the model wrapped extra text.
                start = result_text.find("{")
                end = result_text.rfind("}")
                if start != -1 and end != -1 and end > start:
                    result = json.loads(result_text[start:end + 1])
                else:
                    raise
            
            # Ollama occasionally returns dict values instead of strings.
            # Coerce both fields to plain strings to satisfy Pydantic validation.
            def _to_str(val, fallback: str) -> str:
                if val is None:
                    return fallback
                if isinstance(val, dict):
                    return " / ".join(f"{k}: {v}" for k, v in val.items())
                return str(val)

            meaning_raw = _to_str(result.get("meaning"), "No context provided")
            # Strip leading part-of-speech labels the model may still produce
            meaning_clean = re.sub(
                r'^\s*(?:İsim|Isim|Fiil|Sıfat|Zarf|Bağlaç|Edat|Zamir|Ünlem|Belirteç|Ad|Eylem)\s*[.:\-–—]\s*',
                '', meaning_raw, flags=re.IGNORECASE
            ).strip()
            # Capitalize first letter after stripping
            if meaning_clean:
                meaning_clean = meaning_clean[0].upper() + meaning_clean[1:]

            return {
                "translation": _to_str(result.get("translation"), "Could not translate"),
                "meaning": meaning_clean,
                "example": _to_str(result.get("example"), "") if is_word else "",
            }
        except Exception as e:
            print(f"Ollama AI Error: {e}")
            return {"translation": text, "meaning": "Local AI translation failed.", "example": ""}


async def get_meaning_and_example(text: str, is_word: bool = False):
    """
    Calls local Ollama Llama 3 model to get ONLY meaning and example sentence.
    Translation is handled separately by the multi-provider translation system.
    """
    if is_word:
        prompt = (
            "Sen profesyonel bir Türk sözlük editörüsün. "
            "Aşağıdaki İngilizce kelimeyi analiz et ve YALNIZCA şu iki anahtarı içeren bir JSON objesi döndür: "
            "'meaning' ve 'example'.\n"
            "KURALLAR:\n"
            "- meaning: Kelimenin kısa Türkçe açıklaması. "
            "ÖNEMLİ: Cümleye ASLA 'İsim', 'Fiil', 'Sıfat', 'Zarf', 'Bağlaç' gibi sözcük türü etiketleriyle BAŞLAMA. "
            "Doğrudan açıklamaya başla. Kelimenin ne anlama geldiğini düzgün Türkçe ile 1-2 cümleyle açıkla. "
            "Asla İngilizce kelime kullanma.\n"
            "- example: Bu kelimeyi kullanan ÇOCUKLAR İÇİN bile anlaşılabilir seviyede olabildiğince KISA ve BASİT "
            "bir İngilizce örnek cümle. Sadece İngilizce. Tek cümle. Nokta ile bitir.\n"
            f"İngilizce kelime: '{text}'"
        )
    else:
        prompt = (
            "Sen profesyonel bir çevirmensin. "
            "Aşağıdaki İngilizce cümleyi analiz et ve YALNIZCA şu anahtarı içeren bir JSON objesi döndür: "
            "'meaning'.\n"
            "KURALLAR:\n"
            "- Tüm çıktı YALNIZCA TÜRKÇE olmalıdır. Hiçbir İngilizce kelime veya etiket kullanma.\n"
            "- meaning: Cümlenin bağlamını veya nüansını açıklayan kısa bir Türkçe yorum. Tek cümle.\n"
            f"İngilizce cümle: '{text}'"
        )

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": "llama3",
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "top_p": 0.9,
                        "repeat_penalty": 1.1
                    }
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()

            result_text = data.get("response", "{}")
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                start = result_text.find("{")
                end = result_text.rfind("}")
                if start != -1 and end != -1 and end > start:
                    result = json.loads(result_text[start:end + 1])
                else:
                    raise

            def _to_str(val, fallback: str) -> str:
                if val is None:
                    return fallback
                if isinstance(val, dict):
                    return " / ".join(f"{k}: {v}" for k, v in val.items())
                return str(val)

            meaning_raw = _to_str(result.get("meaning"), "No context provided")
            meaning_clean = re.sub(
                r'^\s*(?:İsim|Isim|Fiil|Sıfat|Zarf|Bağlaç|Edat|Zamir|Ünlem|Belirteç|Ad|Eylem)\s*[.:\-–—]\s*',
                '', meaning_raw, flags=re.IGNORECASE
            ).strip()
            if meaning_clean:
                meaning_clean = meaning_clean[0].upper() + meaning_clean[1:]

            return {
                "meaning": meaning_clean,
                "example": _to_str(result.get("example"), "") if is_word else "",
            }
        except Exception as e:
            print(f"Ollama AI Error (meaning/example): {e}")
            return {"meaning": "Açıklama alınamadı.", "example": ""}

