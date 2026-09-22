"""FastAPI router for lightweight landmark vision detection and storytelling."""

from __future__ import annotations

import base64
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel
import httpx

from app.vision.landmark_service import LandmarkStoryService
from app.vision.place_content import PLACES

router = APIRouter(prefix="/api/vision", tags=["Landmark Vision & AI Storytelling"])

# Lazy singleton
_service: LandmarkStoryService | None = None


def get_landmark_service() -> LandmarkStoryService:
    global _service
    if _service is None:
        _service = LandmarkStoryService()
    return _service


class RecognizeBase64Request(BaseModel):
    image_base64: str


class LandmarkResponseSchema(BaseModel):
    recognized: bool
    place_id: str = ""
    name: str = ""
    confidence: float = 0.0
    good_matches: int = 0
    description: str = ""
    facts: list[str] = []
    highlights: list[str] = []
    story: str = ""
    llm_generated: bool = False


@router.post(
    "/recognize",
    response_model=LandmarkResponseSchema,
    summary="Detect landmark from image upload and generate AI stories & facts",
)
async def recognize_landmark_file(
    file: UploadFile = File(..., description="Image file (.jpg, .jpeg, .png, .webp)"),
) -> LandmarkResponseSchema:
    """Upload a camera capture or photo to detect if it is Ima Keithel, Kangla, etc.

    Returns the identified landmark along with grounded cultural facts and an AI-generated story.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        # Still accept if filename ends with image extension
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Uploaded file '{file.filename}' is not a supported image format (.jpg, .jpeg, .png, .webp).",
            )

    try:
        image_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read image data: {exc}",
        )

    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image file is empty.",
        )

    service = get_landmark_service()
    try:
        result = service.recognize(image_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Landmark detection failed: {exc}",
        )

    return LandmarkResponseSchema(
        recognized=result.recognized,
        place_id=result.place_id,
        name=result.name,
        confidence=result.confidence,
        good_matches=result.good_matches,
        description=result.description,
        facts=result.facts,
        highlights=result.highlights,
        story=result.story,
        llm_generated=result.llm_generated,
    )


@router.post(
    "/recognize-base64",
    response_model=LandmarkResponseSchema,
    summary="Detect landmark from base64 encoded image string",
)
async def recognize_landmark_base64(
    payload: RecognizeBase64Request,
) -> LandmarkResponseSchema:
    """Accepts a base64-encoded image string (with or without data URI prefix)."""
    raw_b64 = payload.image_base64
    if "," in raw_b64:
        # Strip out data:image/...;base64,
        raw_b64 = raw_b64.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(raw_b64)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 image data: {exc}",
        )

    service = get_landmark_service()
    try:
        result = service.recognize(image_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Landmark detection failed: {exc}",
        )

    return LandmarkResponseSchema(
        recognized=result.recognized,
        place_id=result.place_id,
        name=result.name,
        confidence=result.confidence,
        good_matches=result.good_matches,
        description=result.description,
        facts=result.facts,
        highlights=result.highlights,
        story=result.story,
        llm_generated=result.llm_generated,
    )


@router.get(
    "/places",
    summary="List all landmarks currently supported by the vision system",
)
async def get_supported_places() -> dict[str, Any]:
    places_list = [
        {
            "place_id": p.place_id,
            "name": p.name,
            "description": p.description,
            "facts": list(p.facts),
            "highlights": list(p.highlights),
        }
        for p in PLACES.values()
    ]
    return {"places": places_list, "total": len(places_list)}


@router.get(
    "/status",
    summary="Check vision detector and LLM model readiness status",
)
async def get_vision_status() -> dict[str, Any]:
    service = get_landmark_service()
    model_path = service.model_path
    model_loaded = model_path.is_file()

    total_refs = len(service.detector.labels) if model_loaded and hasattr(service.detector, "labels") else 0
    unique_classes = sorted(list({str(lbl) for lbl in service.detector.labels})) if total_refs > 0 else []
    file_size_mb = round(os.path.getsize(model_path) / (1024 * 1024), 2) if model_loaded else 0.0

    # Test LLM reachability
    llm_base_url = service.llm.base_url
    llm_online = False
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            resp = await client.get(f"{llm_base_url}/models")
            llm_online = resp.status_code == 200
    except Exception:
        llm_online = False

    return {
        "status": "ready" if model_loaded else "model_missing",
        "model_file": str(model_path),
        "model_loaded": model_loaded,
        "model_size_mb": file_size_mb,
        "indexed_references": total_refs,
        "supported_classes": unique_classes,
        "llm_service": {
            "base_url": llm_base_url,
            "model": service.llm.model,
            "online": llm_online,
            "fallback_ready": True,
        },
    }


@router.post(
    "/train",
    summary="Trigger retraining / reindexing of the landmark dataset",
)
async def trigger_retrain() -> dict[str, Any]:
    from app.vision.landmark_detector import LandmarkDetector

    service = get_landmark_service()
    if not service.dataset_dir.is_dir():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset directory '{service.dataset_dir}' does not exist.",
        )

    try:
        summary = LandmarkDetector.train(service.dataset_dir, service.model_path)
        # Reload detector
        service.detector = LandmarkDetector(service.model_path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retraining failed: {exc}",
        )

    return {
        "success": True,
        "message": f"Successfully indexed {summary['references']} reference images.",
        "skipped_unusable": summary["skipped"],
        "model_path": str(service.model_path),
    }
