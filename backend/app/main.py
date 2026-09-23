"""Main FastAPI application for Meerup AI, Vision, and Tourism Recommendations."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ai.router import openai_compat_router, router as ai_router
from app.tourism.router import router as recommendations_router
from app.vision.router import get_landmark_service, router as vision_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("meerup.backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure landmark vision detector is initialized & index ready
    logger.info("Starting Meerup Backend... Loading Vision Detector & Landmark Index...")
    try:
        service = get_landmark_service()
        logger.info(
            "Vision model ready with %d reference landmarks.",
            len(getattr(service.detector, "labels", [])),
        )
    except Exception as exc:
        logger.warning("Vision model lazy loading deferred or warning: %s", exc)

    yield

    logger.info("Shutting down Meerup Backend...")


app = FastAPI(
    title="Meerup AI, Vision & Tourism API",
    description="Lightweight Computer Vision, Cultural AI Storytelling, and Web-Scraped Destination Recommendation Cards for Manipur Tourism.",
    version="1.1.0",
    lifespan=lifespan,
)

# Enable CORS for mobile app and web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(vision_router)
app.include_router(recommendations_router)
app.include_router(ai_router)
app.include_router(openai_compat_router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "app": "Meerup AI & Tourism Backend",
        "status": "online",
        "docs": "/docs",
        "vision_endpoints": {
            "recognize_file": "POST /api/vision/recognize",
            "recognize_base64": "POST /api/vision/recognize-base64",
            "supported_places": "GET /api/vision/places",
            "status": "GET /api/vision/status",
        },
        "recommendation_endpoints": {
            "nearby_cards": "GET /api/recommendations/nearby?latitude=24.8170&longitude=93.9368&radius_km=20",
            "search_cards": "GET /api/recommendations/search?q=Andro",
            "single_card": "GET /api/recommendations/{place_id}/card",
        },
        "grounded_ai_endpoints": {
            "chat_grounded": "POST /api/chat/grounded",
            "openai_compat": "POST /v1/chat/completions",
        },
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "meerup-backend"}