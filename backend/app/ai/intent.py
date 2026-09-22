"""Deterministic extraction of supported tourism request constraints."""

from __future__ import annotations

import re
from dataclasses import dataclass


INTEREST_ALIASES = {
    "nature": "nature", "natural": "nature",
    "culture": "culture", "cultural": "culture",
    "photography": "photography", "photo": "photography", "photos": "photography",
    "history": "history", "historical": "history",
    "art": "art", "arts": "art",
    "adventure": "adventure", "adventurous": "adventure",
    "relaxing": "relaxing", "relax": "relaxing", "relaxation": "relaxing",
    "local experience": "local experience",
    "local experiences": "local experience",
}

_NUMBER_WORDS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
}


@dataclass(frozen=True)
class UserIntent:
    interests: list[str]
    available_minutes: int | None
    max_distance_km: float | None


def normalize_interests(interests: list[str] | None) -> list[str]:
    """Return unique canonical interests from structured client data."""
    normalized: list[str] = []
    for interest in interests or []:
        if not isinstance(interest, str):
            continue
        canonical = INTEREST_ALIASES.get(" ".join(interest.lower().split()))
        if canonical and canonical not in normalized:
            normalized.append(canonical)
    return normalized


def extract_intent(message: str | None) -> UserIntent:
    """Extract only known interests and explicit time/distance constraints."""
    text = (message or "").lower()
    return UserIntent(
        interests=_extract_interests(text),
        available_minutes=_extract_available_minutes(text),
        max_distance_km=_extract_max_distance_km(text),
    )


def _extract_interests(text: str) -> list[str]:
    found: list[tuple[int, str]] = []
    for phrase, canonical in INTEREST_ALIASES.items():
        match = re.search(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", text)
        if match:
            found.append((match.start(), canonical))

    interests: list[str] = []
    for _, canonical in sorted(found):
        if canonical not in interests:
            interests.append(canonical)
    return interests


def _extract_available_minutes(text: str) -> int | None:
    if re.search(r"\bhalf(?:\s|-)?a?\s*day\b", text):
        return 240

    number = r"(?P<value>\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten)"
    minute_match = re.search(rf"\b{number}\s*(?:minutes?|mins?)\b", text)
    if minute_match:
        return _to_minutes(minute_match.group("value"), 1)

    hour_match = re.search(rf"\b{number}\s*(?:hours?|hrs?)\b", text)
    if hour_match:
        return _to_minutes(hour_match.group("value"), 60)

    if re.search(r"\bhalf(?:\s|-)?an?\s*hour\b", text):
        return 30
    return None


def _extract_max_distance_km(text: str) -> float | None:
    unit = r"(?:kilometers?|kilometres?|kms?)"
    number = r"(?P<value>\d+(?:\.\d+)?)"
    prefix = r"(?:within|under|below|less than|up to|no more than|maximum of|max of)"
    match = re.search(rf"\b{prefix}\s+{number}\s*{unit}\b", text)
    if not match:
        match = re.search(rf"\b{number}\s*{unit}\s*(?:or less|maximum|max)\b", text)
    if not match:
        return None
    distance = float(match.group("value"))
    return distance if distance > 0 else None


def _to_minutes(value: str, multiplier: int) -> int:
    amount = _NUMBER_WORDS.get(value)
    if amount is None:
        amount = float(value)
    return int(amount * multiplier)
