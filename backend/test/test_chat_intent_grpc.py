from concurrent import futures
import unittest

import grpc

from app.ai.orchestrator import AIOrchestrator
from app.grpc.generated import meerup_pb2, meerup_pb2_grpc
from app.grpc.server import MeerupAIServicer


DESTINATIONS = [
    {"name": "Matai Garden", "interests": ["nature", "photography"], "category": ["garden", "nature"], "estimated_duration_minutes": 60, "distance_km": 4.9},
    {"name": "Andro", "interests": ["culture", "history", "art"], "category": ["village", "culture"], "estimated_duration_minutes": 120, "distance_km": 13.5},
]


class FakeTourismService:
    def nearby_destinations(self, **_kwargs):
        return DESTINATIONS


class RecordingLLM:
    def __init__(self):
        self.messages = None

    def chat(self, messages, **_kwargs):
        self.messages = messages
        return "Andro is the backend-selected recommendation."


class ChatIntentGrpcTests(unittest.TestCase):
    def setUp(self):
        self.llm = RecordingLLM()
        orchestrator = AIOrchestrator(FakeTourismService(), self.llm)
        self.server = grpc.server(futures.ThreadPoolExecutor(max_workers=1))
        meerup_pb2_grpc.add_MeerupAIServicer_to_server(
            MeerupAIServicer(FakeTourismService(), orchestrator), self.server
        )
        port = self.server.add_insecure_port("127.0.0.1:0")
        self.server.start()
        self.channel = grpc.insecure_channel(f"127.0.0.1:{port}")
        self.stub = meerup_pb2_grpc.MeerupAIStub(self.channel)

    def tearDown(self):
        self.channel.close()
        self.server.stop(grace=0).wait()

    def test_omitted_structured_fields_are_extracted_from_chat_message(self):
        request = meerup_pb2.ChatRequest(
            message="I have 2 hours and I want to explore culture",
            location=meerup_pb2.Location(latitude=24.817, longitude=93.9368),
        )

        chunks = list(self.stub.Chat(request, timeout=2))

        self.assertEqual(
            [chunk.text for chunk in chunks],
            ["Andro is the backend-selected recommendation."],
        )
        self.assertEqual(chunks[0].primary_recommendation.name, "Andro")
        self.assertEqual(chunks[0].alternatives[0].name, "Matai Garden")
        prompt = self.llm.messages[1]["content"]
        self.assertIn("Requested interests:\nculture", prompt)
        self.assertIn("Available time:\n120 minutes", prompt)
        self.assertIn(
            "PRIMARY RECOMMENDATION SELECTED BY BACKEND:\nAndro", prompt
        )

    def test_explicit_distance_limit_overrides_the_message_limit(self):
        request = meerup_pb2.ChatRequest(
            message="I want culture within 10 km",
            location=meerup_pb2.Location(latitude=24.817, longitude=93.9368),
            max_distance_km=20,
        )

        chunks = list(self.stub.Chat(request, timeout=2))

        self.assertEqual(chunks[0].primary_recommendation.name, "Andro")
        self.assertIn("Maximum distance:\n20.0 km", self.llm.messages[1]["content"])


if __name__ == "__main__":
    unittest.main()
