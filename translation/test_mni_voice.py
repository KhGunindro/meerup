"""Test English → Manipuri translation + Hindi-based Manipuri voice synthesis."""
import asyncio
import sys
sys.path.insert(0, '.')

from services.local_indic_engine import local_translate, local_synthesize_voice

async def main():
    # Test phrases for En → Mni translation
    test_phrases = [
        "Good morning, how are you?",
        "Welcome to Manipur.",
        "What is your name?",
        "Have you eaten?",
        "Thank you very much.",
        "Hello, how are you?",
        "Good morning. Welcome to Manipur.",
        "I love Manipur.",
        "What are you doing?",
        "I do not understand. Speak slowly.",
    ]

    print("=" * 60)
    print("  English → Manipuri Translation Test")
    print("=" * 60)
    for phrase in test_phrases:
        translation = local_translate(phrase, source_lang="en", target_lang="mni")
        print(f"  EN:  {phrase}")
        print(f"  MNI: {translation}")
        print()

    # Generate voice samples
    print("=" * 60)
    print("  Generating Manipuri voice (Hindi-based, clear prosody)")
    print("=" * 60)
    
    samples = {
        "Welcome to Manipur. How are you?": "test_welcome.wav",
        "Good morning, how are you?": "test_greeting.wav",
        "What is your name?": "test_name.wav",
    }

    for eng_text, filename in samples.items():
        mni_text = local_translate(eng_text, source_lang="en", target_lang="mni")
        print(f"\n  EN: {eng_text}")
        print(f"  MNI: {mni_text}")

        audio = await local_synthesize_voice(mni_text, target_lang="mni", voice_gender="female")
        
        with open(filename, "wb") as f:
            f.write(audio)
        print(f"  ✅ Voice saved: {filename} ({len(audio)} bytes)")

    # Save main test output
    main_text = local_translate("Good morning. Welcome to Manipur. How are you? Have you eaten?", source_lang="en", target_lang="mni")
    print(f"\n  Full test: {main_text}")
    audio = await local_synthesize_voice(main_text, target_lang="mni", voice_gender="female")
    with open("test_output_manipuri_voice.wav", "wb") as f:
        f.write(audio)
    print(f"  ✅ Main voice saved: test_output_manipuri_voice.wav ({len(audio)} bytes)")
    print(f"\n  🎧 Play: open test_output_manipuri_voice.wav")

if __name__ == "__main__":
    asyncio.run(main())
