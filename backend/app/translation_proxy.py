"""
Translation Proxy Router
Forwards translation, ASR, TTS, and STS requests from the unified
Meerup Backend (port 8001) to the Local Translation Engine (port 8000).
"""

from __future__ import annotations

import logging
import httpx
from fastapi import APIRouter, Request, Response

logger = logging.getLogger("meerup.translation_proxy")

router = APIRouter(tags=["Translation Proxy"])

TRANSLATION_SERVICE_URL = "http://127.0.0.1:8000"


async def _forward(request: Request, target_path: str) -> Response:
    target_url = f"{TRANSLATION_SERVICE_URL}{target_path}"
    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"

    body = await request.body()
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
            )
            response_headers = {
                k: v
                for k, v in resp.headers.items()
                if k.lower()
                not in {
                    "transfer-encoding",
                    "content-encoding",
                    "content-length",
                    "connection",
                }
            }
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                headers=response_headers,
                media_type=resp.headers.get("content-type"),
            )
    except Exception as exc:
        logger.error("Error forwarding to translation service %s: %s", target_path, exc)
        return Response(
            content=f'{{"error":"Translation service unavailable","detail":"{str(exc)}"}}'.encode("utf-8"),
            status_code=502,
            media_type="application/json",
        )


@router.api_route("/api/translate-text", methods=["POST", "OPTIONS"])
async def proxy_translate_text(request: Request):
    return await _forward(request, "/api/translate-text")


@router.api_route("/api/tts", methods=["POST", "OPTIONS"])
async def proxy_tts(request: Request):
    return await _forward(request, "/api/tts")


@router.api_route("/api/transcribe", methods=["POST", "OPTIONS"])
async def proxy_transcribe(request: Request):
    return await _forward(request, "/api/transcribe")


@router.api_route("/api/transcribe-json", methods=["POST", "OPTIONS"])
async def proxy_transcribe_json(request: Request):
    return await _forward(request, "/api/transcribe-json")


@router.api_route("/api/sts", methods=["POST", "OPTIONS"])
async def proxy_sts(request: Request):
    return await _forward(request, "/api/sts")


@router.api_route("/api/sts-json", methods=["POST", "OPTIONS"])
async def proxy_sts_json(request: Request):
    return await _forward(request, "/api/sts-json")


@router.api_route("/api/config", methods=["GET", "POST", "OPTIONS"])
async def proxy_config(request: Request):
    return await _forward(request, "/api/config")


@router.api_route("/api/translation/health", methods=["GET"])
async def proxy_translation_health(request: Request):
    return await _forward(request, "/api/health")
