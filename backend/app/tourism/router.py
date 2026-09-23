"""FastAPI router for nearby destination recommendations with live web scraping & social cards."""

from __future__ import annotations

from typing import Annotated
from fastapi import APIRouter, HTTPException, Query, status

from app.tourism.card_models import (
    DestinationCard,
    NearbyCardsResponse,
    SearchCardsResponse,
)
from app.tourism.card_service import RecommendationCardService

router = APIRouter(prefix="/api/recommendations", tags=["Tourism Recommendations & Cards"])

# Singleton service instance
_card_service: RecommendationCardService | None = None


def get_card_service() -> RecommendationCardService:
    global _card_service
    if _card_service is None:
        _card_service = RecommendationCardService()
    return _card_service


@router.get(
    "/nearby",
    response_model=NearbyCardsResponse,
    summary="Get nearby destination recommendation cards enriched with web & social media data",
)
async def get_nearby_recommendation_cards(
    latitude: Annotated[float, Query(description="User GPS latitude, e.g. 24.8170")],
    longitude: Annotated[float, Query(description="User GPS longitude, e.g. 93.9368")],
    radius_km: Annotated[float, Query(description="Search radius in kilometers", ge=1.0, le=200.0)] = 20.0,
    limit: Annotated[int, Query(description="Maximum number of cards to return", ge=1, le=20)] = 5,
    interests: Annotated[list[str] | None, Query(description="Optional interest filters e.g. nature, culture")] = None,
) -> NearbyCardsResponse:
    """Returns a list of destination cards located within `radius_km` of the user's coordinates.

    Each card is structured ready for UI rendering underneath the chat or map, complete with:
    - **Google & Web search snippets**, ratings, visiting hours, and entry fees.
    - **Social media recommendations**: Instagram photo spots, YouTube vlogs, traveler community tips, and hashtags.
    - **Hero & gallery imagery**, distance, and interactive action buttons.
    """
    service = get_card_service()
    try:
        response = await service.get_nearby_cards(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            interests=interests,
            limit=limit,
        )
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendation cards: {exc}",
        )


@router.get(
    "/search",
    response_model=SearchCardsResponse,
    summary="Search destinations and return enriched cards with web & social recommendations",
)
async def search_recommendation_cards(
    q: Annotated[str, Query(description="Search query, e.g. 'Andro', 'waterfall', 'Loktak'", min_length=1)],
    latitude: Annotated[float | None, Query(description="Optional user latitude for distance sorting")] = None,
    longitude: Annotated[float | None, Query(description="Optional user longitude for distance sorting")] = None,
    limit: Annotated[int, Query(description="Max cards to return", ge=1, le=20)] = 5,
) -> SearchCardsResponse:
    """Searches across all known Manipur tourist destinations and returns cards enriched with web and social media data."""
    service = get_card_service()
    try:
        response = await service.search_cards(
            query=q,
            user_lat=latitude,
            user_lon=longitude,
            limit=limit,
        )
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {exc}",
        )


@router.get(
    "/{place_id}/card",
    response_model=DestinationCard,
    summary="Get single detailed destination card by place ID or name",
)
async def get_single_destination_card(
    place_id: str,
    latitude: Annotated[float | None, Query(description="Optional user latitude for distance")] = None,
    longitude: Annotated[float | None, Query(description="Optional user longitude for distance")] = None,
) -> DestinationCard:
    """Returns a single enriched card for a specific destination (e.g. 'andro', 'matai_garden', 'loktak_lake')."""
    service = get_card_service()
    card = await service.get_single_card(place_id, user_lat=latitude, user_lon=longitude)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination '{place_id}' not found.",
        )
    return card
