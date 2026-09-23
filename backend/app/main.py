"""Main FastAPI application for Meerup AI, Vision, and Tourism Recommendations."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ai.router import openai_compat_router, router as ai_router
from app.tourism.router import router as recommendations_router
from app.vision.router import get_landmark_service, router as vision_router
from app.translation_proxy import router as translation_proxy_router

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
app.include_router(translation_proxy_router)


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
=======
"""Main FastAPI application for Meerup AI, Vision, and Tourism Recommendations."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

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


@app.get("/auth/confirm", response_class=HTMLResponse, tags=["Auth"])
async def auth_confirm():
    """Friendly landing page displayed when users confirm email registration."""
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Confirmed · MEERUP</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: linear-gradient(135deg, #064E3B 0%, #0F172A 100%);
          color: #F8FAFC;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .card {
          background: rgba(30, 41, 59, 0.85);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 40px 32px;
          max-width: 440px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .icon-circle {
          width: 72px;
          height: 72px;
          border-radius: 36px;
          background: linear-gradient(135deg, #10B981, #047857);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 32px;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
        }
        h1 {
          font-size: 24px;
          font-weight: 700;
          color: #FFFFFF;
          margin-bottom: 12px;
        }
        p {
          font-size: 15px;
          line-height: 1.6;
          color: #94A3B8;
          margin-bottom: 28px;
        }
        .btn {
          display: inline-block;
          background: #10B981;
          color: #FFFFFF;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          transition: background 0.2s ease, transform 0.1s ease;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
        }
        .btn:hover { background: #059669; }
        .footer-note {
          font-size: 12px;
          color: #64748B;
          margin-top: 24px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon-circle">✓</div>
        <h1>Email Confirmed!</h1>
        <p>Your MEERUP Explorer account has been verified successfully. You can now return to the MEERUP mobile app to sign in.</p>
        <a href="frontend://profile" class="btn">Open MEERUP App</a>
        <div class="footer-note">MEERUP · AI Travel Companion for Manipur</div>
      </div>
    </body>
    </html>
    """
