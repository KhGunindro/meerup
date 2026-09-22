"""
services/sts_engine.py
Unified Speech-to-Speech Engine:
100% Offline AI4Bharat Local Engine (IndicTrans2 + IndicConformer + Local Neural TTS)
"""

from typing import Dict, Any, Optional
from services import local_indic_engine

async def process_speech_translation(
    audio_bytes: bytes,
    source_lang: str = "en",
    target_lang: str = "mni",
    voice_gender: str = "female",
    provider: Optional[str] = None
) -> Dict[str, Any]:
    """
    Processes STS using local AI4Bharat Indic models directly on device.
    """
    return await local_indic_engine.run_local_sts_pipeline(
        audio_bytes=audio_bytes,
        source_lang=source_lang,
        target_lang=target_lang,
        voice_gender=voice_gender
    )

async def process_text_translation(
    text: str,
    source_lang: str = "en",
    target_lang: str = "mni",
    voice_gender: str = "female",
    provider: Optional[str] = None
) -> Dict[str, Any]:
    """
    Translates text using local IndicTrans2 and synthesizes audio locally.
    """
    return await local_indic_engine.run_local_text_pipeline(
        text=text,
        source_lang=source_lang,
        target_lang=target_lang,
        voice_gender=voice_gender
    )

