from __future__ import annotations

from typing import TYPE_CHECKING

from app.ai.intent import extract_intent, normalize_interests
from app.ai.llm import LocalLLM

if TYPE_CHECKING:
    from app.tourism.service import TourismService


class AIOrchestrator:
    """Coordinates deterministic recommendation selection and LLM wording."""

    DEFAULT_RADIUS_KM = 20.0

    def __init__(
        self,
        tourism: "TourismService | None" = None,
        llm: LocalLLM | None = None,
    ):
        if tourism is None:
            from app.tourism.service import TourismService

            tourism = TourismService()
        self.tourism = tourism
        self.llm = llm or LocalLLM()

    def recommend(
        self,
        message: str,
        latitude: float,
        longitude: float,
        interests: list[str] | None = None,
        available_minutes: int | None = None,
        max_distance_km: float | None = None,
    ) -> dict:
        extracted = extract_intent(message)
        resolved_interests = (
            normalize_interests(interests)
            if interests is not None
            else extracted.interests
        )
        resolved_minutes = (
            available_minutes
            if available_minutes is not None
            else extracted.available_minutes
        )
        resolved_distance = self._positive_distance_or_none(
            max_distance_km
            if max_distance_km is not None
            else extracted.max_distance_km
        )
        constraints = self._constraints(
            resolved_interests, resolved_minutes, resolved_distance
        )

        destinations = self.tourism.nearby_destinations(
            latitude=latitude,
            longitude=longitude,
            radius_km=resolved_distance or self.DEFAULT_RADIUS_KM,
        )
        if not destinations:
            return self._empty_result(
                "I couldn't find any destinations in the available area.",
                constraints,
            )

        eligible = []
        for destination in destinations:
            duration = int(destination.get("estimated_duration_minutes", 0) or 0)
            if resolved_minutes is not None and duration > resolved_minutes:
                continue
            if (
                resolved_distance is not None
                and self._destination_distance(destination) > resolved_distance
            ):
                continue
            eligible.append(destination)

        if not eligible:
            return self._empty_result(
                "I couldn't find a destination in the available data that "
                "fits your requested constraints.",
                constraints,
            )

        selected = self._rank_destinations(eligible, resolved_interests)[:5]
        primary = selected[0]
        answer = self.llm.chat(
            messages=[
                {"role": "system", "content": self._system_prompt()},
                {
                    "role": "user",
                    "content": self._build_prompt(
                        message, latitude, longitude, constraints, primary, selected
                    ),
                },
            ],
            temperature=0.1,
            max_tokens=350,
        )
        return {
            "answer": answer,
            "destinations": selected,
            "recommendation": primary,
            "alternatives": selected[1:],
            "constraints": constraints,
        }

    @staticmethod
    def _positive_distance_or_none(value: float | None) -> float | None:
        if value is None:
            return None
        distance = float(value)
        return distance if distance > 0 else None

    @staticmethod
    def _destination_distance(destination: dict) -> float:
        value = destination.get("distance_km")
        return float(value) if value is not None else float("inf")

    @staticmethod
    def _constraints(
        interests: list[str],
        available_minutes: int | None,
        max_distance_km: float | None,
    ) -> dict:
        return {
            "interests": interests,
            "available_minutes": available_minutes,
            "max_distance_km": max_distance_km,
        }

    @staticmethod
    def _empty_result(answer: str, constraints: dict) -> dict:
        return {
            "answer": answer,
            "destinations": [],
            "recommendation": None,
            "alternatives": [],
            "constraints": constraints,
        }

    def _rank_destinations(
        self,
        destinations: list[dict],
        requested_interests: list[str],
    ) -> list[dict]:
        requested = {interest.lower().strip() for interest in requested_interests}
        scored = []
        for destination in destinations:
            destination_interests = {
                str(value).lower().strip()
                for value in (destination.get("interests") or [])
            }
            destination_categories = {
                str(value).lower().strip()
                for value in (destination.get("category") or [])
            }
            scored.append(
                {
                    "destination": destination,
                    "interest_matches": len(requested & destination_interests),
                    "category_matches": len(requested & destination_categories),
                    "duration": int(
                        destination.get("estimated_duration_minutes", 999999)
                        or 999999
                    ),
                    "distance": self._destination_distance(destination),
                }
            )
        scored.sort(
            key=lambda item: (
                -item["interest_matches"],
                -item["category_matches"],
                item["duration"],
                item["distance"],
            )
        )
        return [item["destination"] for item in scored]

    def _build_prompt(
        self,
        message: str,
        latitude: float,
        longitude: float,
        constraints: dict,
        primary: dict,
        destinations: list[dict],
    ) -> str:
        return (
            f"User request:\n{message}\n\n"
            f"User location:\nLatitude: {latitude}\nLongitude: {longitude}\n\n"
            f"Requested interests:\n{', '.join(constraints['interests']) or 'not specified'}\n\n"
            f"Available time:\n{constraints['available_minutes'] if constraints['available_minutes'] is not None else 'not specified'} minutes\n\n"
            f"Maximum distance:\n{constraints['max_distance_km'] if constraints['max_distance_km'] is not None else 'not specified'} km\n\n"
            f"PRIMARY RECOMMENDATION SELECTED BY BACKEND:\n{primary.get('name')}\n\n"
            f"Ranked verified destinations:\n{self._build_context(destinations)}"
        )

    @staticmethod
    def _build_context(destinations: list[dict]) -> str:
        lines = []
        for index, destination in enumerate(destinations, start=1):
            lines.append(
                "\n".join(
                    [
                        f"Rank: {index}",
                        f"Name: {destination.get('name')}",
                        f"Description: {destination.get('description')}",
                        f"Categories: {', '.join(destination.get('category') or [])}",
                        f"Interests: {', '.join(destination.get('interests') or [])}",
                        f"District: {destination.get('district')}",
                        f"Distance from user: {destination.get('distance_km')} km",
                        f"Recommended visit duration: {destination.get('estimated_duration_minutes')} minutes",
                    ]
                )
            )
        return "\n\n".join(lines)

    @staticmethod
    def _system_prompt() -> str:
        return (
            "You are Meerup, a tourism assistant for Manipur. The backend has "
            "already selected and ranked verified destinations. Explain only the "
            "PRIMARY RECOMMENDATION SELECTED BY BACKEND. Never select or reorder "
            "destinations, invent facts, distances, travel times, or attractions. "
            "Recommended visit duration is time at the destination, not travel "
            "time. Use only the supplied destination data and stay concise."
        )
