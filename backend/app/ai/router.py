"""FastAPI router for Grounded Search + AI Tourism Engine.
Combines real-time Google/DuckDuckGo search, verified geographic constraints,
and anti-hallucination guardrails for accurate travel planning.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
import httpx

from app.ai.grounded_service import GroundedSearchAIService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Grounded AI Travel Companion"])

_grounded_service: GroundedSearchAIService | None = None


def get_grounded_service() -> GroundedSearchAIService:
    global _grounded_service
    if _grounded_service is None:
        _grounded_service = GroundedSearchAIService()
    return _grounded_service


class GroundedChatRequest(BaseModel):
    message: str = Field(..., description="User question or query about travel in Manipur")
    latitude: float | None = Field(default=24.8170, description="User current latitude (default: Imphal)")
    longitude: float | None = Field(default=93.9368, description="User current longitude (default: Imphal)")
    available_minutes: int | None = Field(default=None, description="Optional available time in minutes")
    history: list[dict[str, str]] | None = Field(default=None, description="Recent chat history")


class SearchSnippet(BaseModel):
    title: str
    snippet: str
    url: str
    source: str = "web_search"


class LandmarkPlace(BaseModel):
    name: str
    lat: float
    lng: float
    district: str


class GroundedChatResponse(BaseModel):
    text: str
    search_snippets: list[SearchSnippet] = []
    places: list[LandmarkPlace] = []
    matched_destination: str | None = None
    time_feasible: bool = True
    required_minutes: int | None = None


@router.post("/grounded", response_model=GroundedChatResponse, summary="Grounded Search + AI Tourism Chat")
async def chat_grounded(request: GroundedChatRequest) -> GroundedChatResponse:
    """Answers user queries grounded in real-time web search results and verified geospatial facts.

    Prevents AI travel hallucinations (e.g. impossible mountain trip durations or fake gardens).
    """
    service = get_grounded_service()
    try:
        result = await service.answer_query(
            message=request.message,
            user_latitude=request.latitude,
            user_longitude=request.longitude,
            available_minutes=request.available_minutes,
            history=request.history,
        )
        return GroundedChatResponse(**result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Grounded chat error: {exc}",
        )


class AudioGuideTranscriptRequest(BaseModel):
    title: str = Field(..., description="Audio guide title e.g. 'Kangla Sha & The Sacred Royal Lineage'")
    destination_name: str | None = Field(default=None, description="Landmark or destination name")
    narrator: str | None = Field(default=None, description="Narrator persona")
    language: str = Field(default="en", description="'en' for English, 'mni' for Manipuri")


class AudioGuideTranscriptResponse(BaseModel):
    success: bool
    title: str
    language: str
    transcript: str
    narrator: str
    provider: str



PREGENERATED_DATA_FILE = Path(__file__).resolve().parent.parent / "pregeneratedAudio.json"
_pregenerated_audio_cache: dict[str, Any] | None = None


def get_pregenerated_cache() -> dict[str, Any]:
    global _pregenerated_audio_cache
    if _pregenerated_audio_cache is None:
        if PREGENERATED_DATA_FILE.exists():
            try:
                with open(PREGENERATED_DATA_FILE, "r", encoding="utf-8") as f:
                    _pregenerated_audio_cache = json.load(f)
            except Exception as e:
                logger.warning("Could not load pregeneratedAudio.json: %s", e)
                _pregenerated_audio_cache = {}
        else:
            _pregenerated_audio_cache = {}
    return _pregenerated_audio_cache


def find_pregenerated_match(key_or_name: str) -> tuple[str, dict[str, Any]] | None:
    cache = get_pregenerated_cache()
    if not cache:
        return None
    normalized = key_or_name.lower().replace(" ", "-").replace("_", "")
    for k, v in cache.items():
        clean_k = k.lower().replace("-", "").replace("_", "")
        clean_title = v.get("title", "").lower()
        if clean_k in normalized or normalized in clean_k or clean_title in normalized or normalized in clean_title:
            return k, v
    return None


@router.get(
    "/audio-guide/pregenerated/{guide_id}",
    summary="Get pregenerated audio guide and transcript with zero latency",
)
async def get_pregenerated_guide(
    guide_id: str,
    lang: str = "en",
) -> dict[str, Any]:
    """Returns pregenerated transcript and neural audio base64 for the specified destination guide."""
    cache = get_pregenerated_cache()
    match = cache.get(guide_id)
    if not match:
        res = find_pregenerated_match(guide_id)
        if res:
            match = res[1]

    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pregenerated guide '{guide_id}' not found.",
        )

    is_mni = lang == "mni"
    return {
        "success": True,
        "guideId": guide_id,
        "title": match.get("title", ""),
        "language": lang,
        "transcript": match.get("transcriptMni") if is_mni else match.get("transcriptEn"),
        "audioBase64": match.get("audioMni") if is_mni else match.get("audioEn"),
    }


@router.post(
    "/audio-guide/transcript",
    response_model=AudioGuideTranscriptResponse,
    summary="Auto-generate audio guide narration transcript via AI Model",
)
async def generate_audio_guide_transcript(
    request: AudioGuideTranscriptRequest,
) -> AudioGuideTranscriptResponse:
    """Generates an atmospheric cultural audio guide narration transcript dynamically using the AI model,
    or returns instant pregenerated transcripts when available.
    """
    service = get_grounded_service()
    title = request.title
    dest = request.destination_name or ""
    narrator = request.narrator or "Cultural Historian"

    # 1. First check pregenerated store for instantaneous return
    match = find_pregenerated_match(dest or title)
    if match:
        data = match[1]
        t = data.get("transcriptMni" if request.language == "mni" else "transcriptEn", "")
        if t:
            return AudioGuideTranscriptResponse(
                success=True,
                title=request.title,
                language=request.language,
                transcript=t,
                narrator=narrator,
                provider="Meerup Neural Cultural Engine (Pregenerated)",
            )

    prompt = (
        f"You are {narrator}, an expert cultural storyteller of Manipur. "
        f"Write an atmospheric, captivating 60-80 word audio guide narration script for: '{title}'. "
        f"Include historical lore, cultural reverence, and vivid imagery. Keep it concise, engaging, and spoken in tone."
    )

    generated_en = ""
    try:
        if service.llm:
            generated_en = service.llm.chat(
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Please narrate the story of {title} at {dest}."},
                ],
                temperature=0.4,
                max_tokens=220,
            )
    except Exception as exc:
        logger.info("Local LLM story generation notice (%s), using grounded cultural synthesis.", exc)

    if not generated_en or len(generated_en.strip()) < 20:
        lower_t = (title + " " + dest).lower()
        if "kangla" in lower_t:
            generated_en = (
                "Welcome to Kangla Fort, the royal heartbeat of Manipur since 33 CE. "
                "Guarding this sacred gateway stand the colossal Kangla Sha dragon-lion statues, "
                "immortal symbols of Ningthouja royal sovereignty. Listen closely as we unveil the hidden secrets "
                "of the coronation mound, royal burial grounds, and the subterranean sacred waters of ancient Imphal."
            )
        elif "loktak" in lower_t:
            generated_en = (
                "Welcome to Loktak Lake, the jewel of Manipur and the world's only floating lake. "
                "Beneath the mist, circular biomass phumdis drift across mirrored waters. "
                "Here at Keibul Lamjao, the rare Sangai brow-antlered deer steps gracefully across nature's floating meadow, "
                "an ancient wonder found nowhere else on Earth."
            )
        elif "shirui" in lower_t:
            generated_en = (
                "High in the misty peaks of Ukhrul rises Shirui Kashong at 2,835 meters. "
                "Here blooms the legendary Shirui Lily, the state flower of Manipur that defies cultivation anywhere else in the world. "
                "The Tangkhul people revere these windswept slopes where celestial mists meet untamed mountain beauty."
            )
        elif "ima" in lower_t or "keithel" in lower_t:
            generated_en = (
                "Step into Ima Keithel, the world's largest all-women marketplace thriving for over five centuries. "
                "Run exclusively by thousands of married women vendors, this vibrant market is more than a commercial hub—it is "
                "the living soul of Manipur, where the historic Nupi Lan resistance was born and handloom traditions endure."
            )
        elif "andro" in lower_t:
            generated_en = (
                "Nestled at the foothills of the Nongmaiching hills, Andro is an ancient village that preserves the sacred eternal fire, "
                "burning uninterrupted since centuries past. Witness ancient coil pottery crafted without a wheel, and explore the "
                "Mutua Cultural Museum celebrating the indigenous customs of Manipur."
            )
        else:
            generated_en = (
                f"Welcome to {title}. Step into a sanctuary where myth, living history, and untouched nature intertwine. "
                f"As you journey through this sacred landscape, discover the timeless heritage, cultural traditions, and breathtaking beauty of Manipur."
            )

    final_transcript = generated_en.strip()
    if request.language == "mni":
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                trans_res = await client.post(
                    "http://127.0.0.1:8000/api/translate-text",
                    json={
                        "text": generated_en.strip(),
                        "source_language": "en",
                        "target_language": "mni",
                        "generate_voice": False,
                    },
                )
                if trans_res.status_code == 200:
                    data = trans_res.json()
                    translated = data.get("translated_text") or data.get("text")
                    if translated:
                        final_transcript = translated
        except Exception as trans_err:
            logger.warning("Error translating transcript to Manipuri: %s", trans_err)

    return AudioGuideTranscriptResponse(
        success=True,
        title=request.title,
        language=request.language,
        transcript=final_transcript,
        narrator=narrator,
        provider="AI4Bharat & Meerup Cultural AI",
    )



# OpenAI-compatible completion proxy/fallback for clients expecting /v1/chat/completions
openai_compat_router = APIRouter(prefix="/v1", tags=["OpenAI Compatible Grounded Chat"])


class OpenAIMessage(BaseModel):
    role: str
    content: str


class OpenAICompletionRequest(BaseModel):
    model: str | None = None
    messages: list[OpenAIMessage]
    temperature: float | None = 0.2
    max_tokens: int | None = 350
    stream: bool | None = False


@openai_compat_router.post("/chat/completions", summary="OpenAI-compatible Grounded Chat completions")
async def openai_chat_completions(req: OpenAICompletionRequest) -> dict[str, Any]:
    """Provides an OpenAI API compatible endpoint that transparently runs Search + AI grounding."""
    # Find last user message
    user_content = ""
    for msg in reversed(req.messages):
        if msg.role == "user":
            user_content = msg.content
            break

    if not user_content and req.messages:
        user_content = req.messages[-1].content

    service = get_grounded_service()
    history = [{"role": m.role, "content": m.content} for m in req.messages[:-1]]
    result = await service.answer_query(message=user_content, history=history)

    return {
        "id": "chatcmpl-grounded-meerup",
        "object": "chat.completion",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": result["text"],
                },
                "finish_reason": "stop",
            }
        ],
        "grounding": {
            "search_snippets": result.get("search_snippets", []),
            "time_feasible": result.get("time_feasible", True),
            "matched_destination": result.get("matched_destination"),
        },
    }
