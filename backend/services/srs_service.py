import datetime

RATING_TO_QUALITY = {
    "again": 0,
    "mid": 2,
    "good": 4,
    "easy": 5,
}

def calculate_sm2(quality: int, repetitions: int, ease_factor: float, interval: int):
    if quality >= 3:
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(interval * ease_factor)
        repetitions += 1
    else:
        repetitions = 0
        interval = 1

    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if ease_factor < 1.3:
        ease_factor = 1.3

    return repetitions, ease_factor, interval


def determine_level(repetitions: int, interval: int, success_rate: float):
    if repetitions == 0 and interval == 0:
        return "NEW"
    elif repetitions < 3 or interval < 7:
        return "LEARNING"
    elif success_rate >= 0.85 and interval >= 21:
        return "MASTERED"
    else:
        return "REVIEW"


def process_review(progress_data, rating: str, is_correct: bool):
    quality = RATING_TO_QUALITY.get(rating, 2)

    reps, ef, interval = calculate_sm2(
        quality=quality,
        repetitions=progress_data.repetitions,
        ease_factor=progress_data.ease_factor,
        interval=progress_data.interval,
    )

    now = datetime.datetime.utcnow()
    next_review = now + datetime.timedelta(days=interval)

    total_reviews = (progress_data.total_reviews or 0) + 1
    correct_reviews = (progress_data.correct_reviews or 0) + (1 if is_correct else 0)
    wrong_reviews = (progress_data.wrong_reviews or 0) + (0 if is_correct else 1)
    success_rate = correct_reviews / total_reviews if total_reviews > 0 else 0.0

    # difficulty_score: lower ease_factor + lower success = harder card (0–1 scale)
    difficulty_score = round((1 - success_rate) * (1 / max(ef, 1.3)), 4)

    level = determine_level(reps, interval, success_rate)

    return {
        "repetitions": reps,
        "ease_factor": ef,
        "interval": interval,
        "next_review": next_review,
        "last_review": now,
        "total_reviews": total_reviews,
        "correct_reviews": correct_reviews,
        "wrong_reviews": wrong_reviews,
        "success_rate": success_rate,
        "difficulty_score": difficulty_score,
        "level": level,
    }
