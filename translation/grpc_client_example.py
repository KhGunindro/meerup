"""
grpc_client_example.py
Example gRPC client demonstrating how to invoke the SpeechTranslationService over gRPC.
"""

import sys
import os
import grpc

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from proto import sts_pb2
from proto import sts_pb2_grpc

def test_grpc_client(server_address: str = "localhost:50051"):
    print(f"Connecting to gRPC server at {server_address}...")
    channel = grpc.insecure_channel(server_address)
    stub = sts_pb2_grpc.SpeechTranslationServiceStub(channel)

    # 1. Health Check
    health_response = stub.CheckHealth(sts_pb2.HealthCheckRequest())
    print(f"✅ Health Check: status='{health_response.status}', bhashini_configured={health_response.bhashini_configured}")

    # 2. Text Translation Test (NMT + TTS)
    print("\nSending Text Translation Request (English -> Manipuri)...")
    try:
        response = stub.TranslateText(
            sts_pb2.TextTranslationRequest(
                text="Hello, where is Kangla Fort?",
                source_language="en",
                target_language="mni",
                voice_gender="female"
            )
        )
        print(f"Original Text: {response.original_text}")
        print(f"Translated Text: {response.translated_text}")
        print(f"Audio Content Received: {len(response.audio_content)} bytes")
        print(f"Latency: {response.latency_ms} ms")
    except grpc.RpcError as e:
        print(f"gRPC Call error: {e.code()} - {e.details()}")

if __name__ == "__main__":
    test_grpc_client()
