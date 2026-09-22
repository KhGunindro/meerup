"""
test_sts_pipeline.py
Runs end-to-end Speech-to-Speech (STS) translation on test audio files
and saves the synthesized voice output.
"""

import os
import asyncio
from services import local_indic_engine

async def main():
    test_file = "test_voice_english_kangla.wav"
    output_voice_file = "test_output_manipuri_voice.wav"

    print("=========================================================")
    print("🎙️ RUNNING LOCAL SPEECH-TO-SPEECH (STS) PIPELINE TEST")
    print(f"Input Voice File: {test_file}")
    print("=========================================================")

    with open(test_file, "rb") as f:
        audio_bytes = f.read()

    # Run English -> Manipuri STS
    result = await local_indic_engine.run_local_sts_pipeline(
        audio_bytes=audio_bytes,
        source_lang="en",
        target_lang="mni",
        voice_gender="female"
    )

    print("\n--- [STS RESULTS] ---")
    print("1. Recognized English Speech (ASR):", result["recognized_text"])
    print("2. Translated Manipuri (Meetei Mayek):", result["translated_text"])
    print("3. Pipeline Latency:", result["latency_ms"], "ms")
    print("4. Engine Provider:", result["provider"])

    # Save output voice audio
    if result.get("audio_content"):
        with open(output_voice_file, "wb") as f:
            f.write(result["audio_content"])
        print(f"5. Generated Voice Saved To: {output_voice_file} ({len(result['audio_content'])} bytes)")

    # Test reverse: Manipuri -> English Voice Translation
    print("\n=========================================================")
    print("🔄 TESTING REVERSE TRANSLATION (Manipuri -> English)")
    print("=========================================================")
    manipuri_text = result["translated_text"]

    rev_result = await local_indic_engine.run_local_text_pipeline(
        text=manipuri_text,
        source_lang="mni",
        target_lang="en",
        voice_gender="female"
    )

    rev_voice_file = "test_output_english_voice.wav"
    print("1. Input Manipuri (Meetei Mayek):", rev_result["original_text"])
    print("2. Translated English Text:", rev_result["translated_text"])
    if rev_result.get("audio_content"):
        with open(rev_voice_file, "wb") as f:
            f.write(rev_result["audio_content"])
        print(f"3. English Voice Synthesized To: {rev_voice_file} ({len(rev_result['audio_content'])} bytes)")

    print("\n=========================================================")
    print("✅ All test voice outputs generated successfully!")
    print("=========================================================")

if __name__ == "__main__":
    asyncio.run(main())
