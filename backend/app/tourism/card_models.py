"""Pydantic data models for enriched destination recommendation cards."""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class WebSearchSnippet(BaseModel):
    title: str
    snippet: str
    url: str
    source: str = "Google Search"


class WebRecommendations(BaseModel):
    rating: float | None = Field(default=None, description="Average review rating e.g. 4.6")
    review_count: int | None = Field(default=None, description="Number of reviews indexed")
    summary: str = Field(default="", description="Scraped/synthesized overview from web search results")
    best_time_to_visit: str = Field(default="", description="Optimal season or time of day")
    entry_fee: str = Field(default="", description="Entry ticket or guide fees")
    opening_hours: str = Field(default="", description="Visiting hours")
    top_search_snippets: list[WebSearchSnippet] = Field(default_factory=list)


class YouTubeVlog(BaseModel):
    title: str
    channel: str
    url: str


class SocialRecommendations(BaseModel):
    trending_score: int = Field(default=85, ge=1, le=100, description="Community interest score (1-100)")
    instagram_spots: list[str] = Field(default_factory=list, description="Top aesthetic photo spots")
    youtube_vlogs: list[YouTubeVlog] = Field(default_factory=list, description="Popular vlogs & guides")
    traveler_tips: list[str] = Field(default_factory=list, description="Crowdsourced traveler recommendations")
    hashtags: list[str] = Field(default_factory=list, description="Trending social hashtags")


class CardAction(BaseModel):
    type: Literal["navigate", "share", "bookmark", "view_details"]
    label: str
    payload: dict[str, Any] = Field(default_factory=dict)


class DestinationCard(BaseModel):
    id: str
    title: str
    subtitle: str
    district: str = ""
    description: str
    hero_image: str
    gallery_images: list[str] = Field(default_factory=list)
    coordinates: Coordinates
    distance_km: float = 0.0
    estimated_duration_minutes: int = 60
    categories: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    badge: str | None = None
    web_recommendations: WebRecommendations = Field(default_factory=WebRecommendations)
    social_recommendations: SocialRecommendations = Field(default_factory=SocialRecommendations)
    actions: list[CardAction] = Field(default_factory=list)


class NearbyCardsResponse(BaseModel):
    total: int
    user_location: Coordinates | None = None
    radius_km: float = 20.0
    cards: list[DestinationCard] = Field(default_factory=list)


class SearchCardsResponse(BaseModel):
    query: str
    total: int
    cards: list[DestinationCard] = Field(default_factory=list)
