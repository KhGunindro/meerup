"""
grpc_server.py
High-performance gRPC Server for Speech-to-Speech (STS) Translation.
Service: SpeechTranslationService (Hugging Face & Bhashini ASR -> NMT -> TTS)
"""

import sys
import os
from concurrent import futures
import grpc
import asyncio

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from proto import sts_pb2
from proto import sts_pb2_grpc
from services import sts_engine

class SpeechTranslationServicer(sts_pb2_grpc.SpeechTranslationServiceServicer):
    """
    gRPC Servicer implementing Speech-to-Speech Translation.
    Chains ASR -> NMT -> TTS using local offline AI4Bharat Indic stack.
    """

    def TranslateSpeech(self, request, context):
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                sts_engine.process_speech_translation(
                    audio_bytes=request.audio_content,
                    source_lang=request.source_language or "en",
                    target_lang=request.target_language or "mni",
                    voice_gender=request.voice_gender or "female"
                )
            )
            loop.close()

            return sts_pb2.SpeechTranslationResponse(
                recognized_text=result.get("recognized_text", ""),
                translated_text=result.get("translated_text", ""),
                audio_content=result.get("audio_content", b""),
                audio_format=result.get("audio_format", "wav"),
                latency_ms=result.get("latency_ms", 0)
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return sts_pb2.SpeechTranslationResponse()

    def TranslateText(self, request, context):
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                sts_engine.process_text_translation(
                    text=request.text,
                    source_lang=request.source_language or "en",
                    target_lang=request.target_language or "mni",
                    voice_gender=request.voice_gender or "female"
                )
            )
            loop.close()

            return sts_pb2.TextTranslationResponse(
                original_text=result.get("original_text", ""),
                translated_text=result.get("translated_text", ""),
                audio_content=result.get("audio_content", b""),
                audio_format=result.get("audio_format", "wav"),
                latency_ms=result.get("latency_ms", 0)
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return sts_pb2.TextTranslationResponse()

    def CheckHealth(self, request, context):
        return sts_pb2.HealthCheckResponse(
            status="healthy",
            bhashini_configured=True
        )

def serve(port: int = 50051):
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    sts_pb2_grpc.add_SpeechTranslationServiceServicer_to_server(
        SpeechTranslationServicer(), server
    )
    bind_address = f"[::]:{port}"
    server.add_insecure_port(bind_address)
    print(f"🚀 [gRPC Server] STS Translation Service listening on {bind_address}")
    server.start()
    return server

if __name__ == "__main__":
    server = serve(50051)
    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        server.stop(0)
