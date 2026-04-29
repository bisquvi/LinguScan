import easyocr
import cv2
import numpy as np
import re

reader = easyocr.Reader(['en'])

_PUNCT_ONLY = re.compile(r'^[\W_]+$')


def _bbox_to_rect(bbox):
    top_left = bbox[0]
    bottom_right = bbox[2]
    x = int(top_left[0])
    y = int(top_left[1])
    w = int(bottom_right[0] - top_left[0])
    h = int(bottom_right[1] - top_left[1])
    return x, y, w, h


def _split_word_boxes(text: str, x: int, y: int, w: int, h: int):
    
    tokens = text.split()
    if not tokens:
        return []

    total_chars = sum(len(t) for t in tokens)
    if total_chars == 0:
        return []

    result = []
    cursor_x = x
    for token in tokens:
        ratio = len(token) / total_chars
        token_w = max(4, int(w * ratio))

        clean = token.strip('.,;:!?"\'()[]{}&%@#')
        if not _PUNCT_ONLY.match(token) and clean:
            result.append({
                "text": clean,
                "box": {
                    "x": cursor_x,
                    "y": y,
                    "width": token_w,
                    "height": h,
                }
            })
        cursor_x += token_w

    return result


def _is_inside(word_box: dict, sx: int, sy: int, sw: int, sh: int, tolerance: int = 8) -> bool:
    wx = word_box["box"]["x"] + word_box["box"]["width"] / 2
    wy = word_box["box"]["y"] + word_box["box"]["height"] / 2
    return (sx - tolerance <= wx <= sx + sw + tolerance and
            sy - tolerance <= wy <= sy + sh + tolerance)


def process_image_for_ocr(image_bytes: bytes):
   
    image = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)

    # ── Pass 1: sentence / paragraph level ──────────────────────────
    sentence_results = reader.readtext(image, paragraph=True)

    # ── Pass 2: segment level (EasyOCR groups roughly by word/phrase) ─
    segment_results = reader.readtext(image, paragraph=False, width_ths=0.3, min_size=8)

    all_words = []
    for (bbox, text, _prob) in segment_results:
        x, y, w, h = _bbox_to_rect(bbox)
        if w <= 0 or h <= 0:
            continue
        all_words.extend(_split_word_boxes(text, x, y, w, h))

    ocr_data = []
    for row in sentence_results:
        bbox, paragraph_text = row[0], row[1]
        sx, sy, sw, sh = _bbox_to_rect(bbox)
        if sw <= 0 or sh <= 0:
            continue

        matched = [w for w in all_words if _is_inside(w, sx, sy, sw, sh)]

        seen = set()
        unique_words = []
        for w in matched:
            key = (w["text"].lower(), w["box"]["x"])
            if key not in seen:
                seen.add(key)
                unique_words.append(w)

      
        raw_sentences = [s.strip() for s in re.split(r'(?<=\.)\s*', paragraph_text) if s.strip()]

        word_index = 0
        for s_text in raw_sentences:
            s_clean_tokens = []
            for token in s_text.split():
                clean = token.strip('.,;:!?"\'()[]{}&%@#')
                if not _PUNCT_ONLY.match(token) and clean:
                    s_clean_tokens.append(clean)
            
            scount = len(s_clean_tokens)
            s_words = unique_words[word_index:word_index+scount]
            word_index += scount

            if s_words:
                min_x = min(w["box"]["x"] for w in s_words)
                min_y = min(w["box"]["y"] for w in s_words)
                max_r = max(w["box"]["x"] + w["box"]["width"] for w in s_words)
                max_b = max(w["box"]["y"] + w["box"]["height"] for w in s_words)
                
                padding = 4
                s_box = {
                    "x": max(0, min_x - padding),
                    "y": max(0, min_y - padding),
                    "width": (max_r - min_x) + padding * 2,
                    "height": (max_b - min_y) + padding * 2
                }
            else:
                # Fallback
                s_box = {"x": sx, "y": sy, "width": sw, "height": sh}

            ocr_data.append({
                "text": s_text,
                "box": s_box,
                "words": s_words,
            })

    return ocr_data
