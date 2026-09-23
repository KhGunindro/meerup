"""
main.py
FastAPI Web and REST Gateway for Speech-to-Speech (STS) Translation.
Powered by AI4Bharat Indic Stack:
  - ASR: IndicConformer (Hybrid CTC-RNNT Large)
  - NMT: IndicTrans2
  - TTS: IndicTTS
"""

import os
import sys
import base64
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services import sts_engine
from services import local_indic_engine
import grpc_server

app = FastAPI(
    title="Meerup STS Translation Engine",
    description="English ⟷ Manipuri Speech Translation powered by AI4Bharat IndicConformer & IndicTrans2",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas
class TranscribeJsonRequest(BaseModel):
    audio_base64: str
    source_language: Optional[str] = "en"
    source_lang: Optional[str] = None

class TTSRequest(BaseModel):
    text: str
    target_language: Optional[str] = "mni"
    target_lang: Optional[str] = None
    voice_gender: Optional[str] = "female"
    return_binary: Optional[bool] = False

class STSJsonRequest(BaseModel):
    audio_base64: str
    source_language: str = "en"
    target_language: str = "mni"
    voice_gender: str = "female"
    provider: Optional[str] = None

class TextTranslationRequest(BaseModel):
    text: str
    source_language: Optional[str] = "en"
    target_language: Optional[str] = "mni"
    source_lang: Optional[str] = None
    target_lang: Optional[str] = None
    voice_gender: str = "female"
    provider: Optional[str] = None
    generate_voice: bool = True  # Set False for text-only (fast, no TTS)

class ConfigRequest(BaseModel):
    hf_token: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    try:
        app.state.grpc_server = grpc_server.serve(50051)
        print("✅ [FastAPI] gRPC STS server running on port 50051")
    except Exception as e:
        print(f"⚠️ [FastAPI] Could not start gRPC server: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    if hasattr(app.state, "grpc_server"):
        app.state.grpc_server.stop(0)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "engine_ready": True,
        "active_engine": "AI4Bharat Local Offline Engine (Apple Silicon GPU)",
        "models": {
            "asr_en": "openai/whisper-tiny.en (Local MPS)",
            "asr_mni": "ai4bharat/indic-conformer-600m-multilingual (Local ONNX)",
            "nmt_en_indic": "ai4bharat/indictrans2-en-indic-dist-200M (Local MPS)",
            "nmt_indic_en": "ai4bharat/indictrans2-indic-en-dist-200M (Local MPS)",
            "tts": "Local Neural Speech Synthesizer"
        },
        "languages": ["en (English)", "mni (Manipuri / Meeteilon ꯃꯤꯇꯩ ꯃꯌꯦꯛ)"]
    }

@app.post("/api/config")
async def update_config(config: ConfigRequest):
    """Update Hugging Face token for Indic models in runtime."""
    if config.hf_token is not None:
        os.environ["HF_TOKEN"] = config.hf_token
    return {
        "success": True,
        "message": "Engine configuration updated successfully",
        "engine_ready": True
    }

@app.post("/api/sts")
async def speech_to_speech(
    file: Optional[UploadFile] = File(None),
    source_language: str = Form("en"),
    target_language: str = Form("mni"),
    voice_gender: str = Form("female"),
    provider: Optional[str] = Form(None)
):
    """
    STS endpoint: AI4Bharat IndicConformer/Whisper (ASR) -> IndicTrans2 (NMT) -> Voice (TTS).
    """
    if not file:
        raise HTTPException(status_code=400, detail="No audio file uploaded.")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio content.")

    try:
        result = await sts_engine.process_speech_translation(
            audio_bytes=audio_bytes,
            source_lang=source_language,
            target_lang=target_language,
            voice_gender=voice_gender,
            provider=provider
        )

        audio_b64 = ""
        if result.get("audio_content"):
            audio_b64 = base64.b64encode(result["audio_content"]).decode("utf-8")

        return {
            "success": True,
            "provider": result.get("provider", "AI4Bharat Local Indic Stack"),
            "source_language": result.get("source_language", source_language),
            "target_language": result.get("target_language", target_language),
            "recognized_text": result.get("recognized_text", ""),
            "translated_text": result.get("translated_text", ""),
            "audio_base64": audio_b64,
            "audio_format": result.get("audio_format", "wav"),
            "latency_ms": result.get("latency_ms", 0)
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Indic STS Pipeline Error: {str(e)}")

@app.post("/api/sts-json")
async def speech_to_speech_json(req: STSJsonRequest):
    """
    Direct STS endpoint via base64 JSON payload.
    """
    if not req.audio_base64:
        raise HTTPException(status_code=400, detail="Missing audio_base64.")

    try:
        b64_str = req.audio_base64
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        audio_bytes = base64.b64decode(b64_str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 audio: {e}")

    try:
        result = await sts_engine.process_speech_translation(
            audio_bytes=audio_bytes,
            source_lang=req.source_language,
            target_lang=req.target_language,
            voice_gender=req.voice_gender,
            provider=req.provider
        )

        audio_b64 = ""
        if result.get("audio_content"):
            audio_b64 = base64.b64encode(result["audio_content"]).decode("utf-8")

        return {
            "success": True,
            "provider": result.get("provider", "AI4Bharat Indic Stack"),
            "source_language": result.get("source_language", req.source_language),
            "target_language": result.get("target_language", req.target_language),
            "recognized_text": result.get("recognized_text", ""),
            "translated_text": result.get("translated_text", ""),
            "audio_base64": audio_b64,
            "audio_format": result.get("audio_format", "wav"),
            "latency_ms": result.get("latency_ms", 0)
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Indic STS Pipeline Error: {str(e)}")

@app.post("/api/translate-text")
async def translate_text(req: TextTranslationRequest):
    """
    Translates text via IndicTrans2.
    Voice synthesis is optional (generate_voice=True to include audio).
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    try:
        import time
        start_time = time.time()

        effective_src = req.source_lang or req.source_language or "en"
        effective_tgt = req.target_lang or req.target_language or "mni"

        if req.generate_voice:
            # Full pipeline: translate + generate voice
            result = await sts_engine.process_text_translation(
                text=req.text,
                source_lang=effective_src,
                target_lang=effective_tgt,
                voice_gender=req.voice_gender,
                provider=req.provider
            )
            audio_b64 = ""
            if result.get("audio_content"):
                audio_b64 = base64.b64encode(result["audio_content"]).decode("utf-8")

            return {
                "success": True,
                "provider": "AI4Bharat IndicTrans2",
                "original_text": result.get("original_text", ""),
                "translated_text": result.get("translated_text", ""),
                "audio_base64": audio_b64,
                "latency_ms": result.get("latency_ms", 0)
            }
        else:
            # Fast text-only: translate without voice generation
            translated = local_indic_engine.local_translate(
                req.text,
                source_lang=effective_src,
                target_lang=effective_tgt
            )
            latency_ms = int((time.time() - start_time) * 1000)

            return {
                "success": True,
                "provider": "AI4Bharat IndicTrans2",
                "original_text": req.text,
                "translated_text": translated,
                "audio_base64": "",
                "latency_ms": latency_ms
            }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Indic Translation Error: {str(e)}")

@app.post("/api/transcribe")
async def transcribe_audio(
    file: Optional[UploadFile] = File(None),
    source_language: str = Form("en"),
    source_lang: Optional[str] = Form(None)
):
    """
    Voice Capture / Speech-to-Text (ASR) via IndicConformer (Manipuri) or Whisper (English).
    Takes an uploaded audio file (WAV/MP3/WebM/M4A).
    """
    if not file:
        raise HTTPException(status_code=400, detail="No audio file uploaded.")
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio content.")

    src = source_lang or source_language or "en"
    text = local_indic_engine.local_transcribe(audio_bytes, source_lang=src)
    return {
        "success": True,
        "source_language": src,
        "recognized_text": text
    }

@app.post("/api/transcribe-json")
async def transcribe_audio_json(req: TranscribeJsonRequest):
    """
    Voice Capture / Speech-to-Text (ASR) via Base64 JSON payload.
    Ideal for mobile / Flutter / React Native voice recording.
    """
    if not req.audio_base64:
        raise HTTPException(status_code=400, detail="Missing audio_base64.")
    try:
        b64_str = req.audio_base64
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        audio_bytes = base64.b64decode(b64_str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 audio: {e}")

    src = req.source_lang or req.source_language or "en"
    text = local_indic_engine.local_transcribe(audio_bytes, source_lang=src)
    return {
        "success": True,
        "source_language": src,
        "recognized_text": text
    }

@app.post("/api/tts")
async def synthesize_text_to_speech(req: TTSRequest):
    """
    Text-to-Speech (TTS) voice synthesizer.
    Generates high-fidelity neural audio for English or Manipuri text.
    Returns base64 WAV or direct binary audio/wav stream.
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    tgt = req.target_lang or req.target_language or "mni"
    gender = req.voice_gender or "female"
    audio_bytes = await local_indic_engine.local_synthesize_voice(
        text=req.text,
        target_lang=tgt,
        voice_gender=gender
    )

    if req.return_binary:
        return Response(content=audio_bytes, media_type="audio/wav")

    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else ""
    return {
        "success": True,
        "text": req.text,
        "target_language": tgt,
        "voice_gender": gender,
        "audio_base64": audio_b64,
        "audio_format": "wav"
    }

# Mount static web directory
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def serve_index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Meerup STS (AI4Bharat IndicConformer) Running"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
