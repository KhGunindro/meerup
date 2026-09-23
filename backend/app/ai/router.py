"""FastAPI router for Grounded Search + AI Tourism Engine.
Combines real-time Google/DuckDuckGo search, verified geographic constraints,
and anti-hallucination guardrails for accurate travel planning.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

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
        logger.exception("Error during grounded chat inference: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Grounded chat error: {exc}",
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
