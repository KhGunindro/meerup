import unittest

from app.ai.intent import extract_intent, normalize_interests
from app.ai.orchestrator import AIOrchestrator


DESTINATIONS = [
    {
        "name": "Matai Garden",
        "interests": ["nature", "photography", "relaxing"],
        "category": ["garden", "nature"],
        "estimated_duration_minutes": 60,
        "distance_km": 4.9,
    },
    {
        "name": "Andro",
        "interests": ["culture", "history", "art", "local experience"],
        "category": ["village", "culture"],
        "estimated_duration_minutes": 120,
        "distance_km": 13.5,
    },
]


class FakeTourismService:
    def __init__(self):
        self.radius_km = None

    def nearby_destinations(self, **kwargs):
        self.radius_km = kwargs["radius_km"]
        return DESTINATIONS


class FakeLLM:
    def chat(self, **_kwargs):
        return "Explanation generated from backend-selected context."


class IntentExtractionTests(unittest.TestCase):
    def test_extracts_culture_and_two_hours(self):
        intent = extract_intent("I have 2 hours and I want to explore culture")
        self.assertEqual(intent.interests, ["culture"])
        self.assertEqual(intent.available_minutes, 120)
        self.assertIsNone(intent.max_distance_km)

    def test_extracts_short_time_and_nature(self):
        intent = extract_intent("I have 30 minutes and want nature")
        self.assertEqual(intent.interests, ["nature"])
        self.assertEqual(intent.available_minutes, 30)

    def test_extracts_multiple_interests_without_inventing_any(self):
        intent = extract_intent("I want nature and photography, plus a beach")
        self.assertEqual(intent.interests, ["nature", "photography"])
        self.assertIsNone(intent.available_minutes)

    def test_extracts_an_explicit_distance_limit_without_guessing_nearby(self):
        intent = extract_intent("I want art within 10 km, somewhere nearby")
        self.assertEqual(intent.interests, ["art"])
        self.assertEqual(intent.max_distance_km, 10.0)

    def test_supports_half_a_day_and_normalizes_structured_values(self):
        intent = extract_intent("I have half a day for local experiences and art")
        self.assertEqual(intent.available_minutes, 240)
        self.assertEqual(intent.interests, ["local experience", "art"])
        self.assertEqual(
            normalize_interests([" Culture ", "LOCAL EXPERIENCES", "unknown"]),
            ["culture", "local experience"],
        )


class OrchestratorIntentTests(unittest.TestCase):
    def setUp(self):
        self.tourism = FakeTourismService()
        self.orchestrator = AIOrchestrator(self.tourism, FakeLLM())

    def test_message_constraints_drive_the_deterministic_recommendation(self):
        result = self.orchestrator.recommend(
            message="I have 2 hours and I want to explore culture",
            latitude=24.817,
            longitude=93.9368,
        )
        self.assertEqual(result["destinations"][0]["name"], "Andro")

    def test_message_time_limit_excludes_longer_destinations(self):
        result = self.orchestrator.recommend(
            message="I have 30 minutes and want nature",
            latitude=24.817,
            longitude=93.9368,
        )
        self.assertEqual(result["destinations"], [])

    def test_explicit_grpc_values_override_the_message(self):
        result = self.orchestrator.recommend(
            message="I have 30 minutes and want nature",
            latitude=24.817,
            longitude=93.9368,
            interests=["culture"],
            available_minutes=120,
        )
        self.assertEqual(result["destinations"][0]["name"], "Andro")

    def test_multiple_message_interests_keep_backend_ranking(self):
        result = self.orchestrator.recommend(
            message="I want nature and photography",
            latitude=24.817,
            longitude=93.9368,
        )
        self.assertEqual(result["destinations"][0]["name"], "Matai Garden")

    def test_distance_limit_is_used_for_retrieval_and_hard_filtering(self):
        result = self.orchestrator.recommend(
            message="I want culture within 4 km",
            latitude=24.817,
            longitude=93.9368,
        )
        self.assertEqual(self.tourism.radius_km, 4.0)
        self.assertEqual(result["destinations"], [])
        self.assertIsNone(result["recommendation"])

    def test_explicit_distance_overrides_message_and_exposes_alternatives(self):
        result = self.orchestrator.recommend(
            message="I want culture within 10 km",
            latitude=24.817,
            longitude=93.9368,
            max_distance_km=20,
        )
        self.assertEqual(self.tourism.radius_km, 20.0)
        self.assertEqual(result["recommendation"]["name"], "Andro")
        self.assertEqual(result["alternatives"][0]["name"], "Matai Garden")
        self.assertEqual(result["constraints"]["max_distance_km"], 20.0)


if __name__ == "__main__":
    unittest.main()
