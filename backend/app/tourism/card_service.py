"""Card service for assembling enriched destination cards with web search & social data."""

from __future__ import annotations

import logging
import math
import time
from typing import Any

from app.tourism.card_models import (
    CardAction,
    Coordinates,
    DestinationCard,
    NearbyCardsResponse,
    SearchCardsResponse,
)
from app.tourism.service import TourismService
from app.tourism.web_scraper import CURATED_DESTINATIONS, WebScraperService

logger = logging.getLogger(__name__)

# Fallback catalog if Supabase is offline or coordinates are empty
DEFAULT_DESTINATIONS: list[dict[str, Any]] = [
    {
        "id": "andro_village",
        "name": "Andro",
        "district": "Imphal East",
        "latitude": 24.7773,
        "longitude": 94.0632,
        "description": "Ancient village famous for its traditional coil pottery, the Mutua Cultural Museum, and sacred fire temple.",
        "category": ["village", "culture", "heritage"],
        "interests": ["culture", "history", "art", "pottery", "photography"],
        "estimated_duration_minutes": 120,
    },
    {
        "id": "matai_garden",
        "name": "Matai Garden",
        "district": "Imphal East",
        "latitude": 24.8560,
        "longitude": 93.9140,
        "description": "Well-maintained botanical space known for intricately manicured Duranta topiary plants, blooming flowers, and serene walkways.",
        "category": ["garden", "nature", "botanical"],
        "interests": ["nature", "photography", "relaxing", "family"],
        "estimated_duration_minutes": 60,
    },
    {
        "id": "sadu_chiru_waterfall",
        "name": "Sadu Chiru Waterfall",
        "district": "Kangpokpi",
        "latitude": 24.7430,
        "longitude": 93.7600,
        "description": "A picturesque multi-tiered cascade nestled in lush green forested hills, perfect for nature lovers and light trekking.",
        "category": ["waterfall", "nature", "trekking"],
        "interests": ["nature", "photography", "adventure", "hiking"],
        "estimated_duration_minutes": 120,
    },
    {
        "id": "loktak_lake",
        "name": "Loktak Lake & Sendra",
        "district": "Bishnupur",
        "latitude": 24.5160,
        "longitude": 93.7840,
        "description": "The largest freshwater lake in Northeast India and the world's only floating lake with circular vegetative phumdis.",
        "category": ["lake", "nature", "eco-tourism"],
        "interests": ["boating", "photography", "nature", "wildlife", "sunset"],
        "estimated_duration_minutes": 180,
    },
    {
        "id": "keibul_lamjao",
        "name": "Keibul Lamjao National Park",
        "district": "Bishnupur",
        "latitude": 24.4900,
        "longitude": 93.9000,
        "description": "The world's only floating national park and last natural refuge of the endangered brow-antlered Sangai deer.",
        "category": ["national park", "wildlife", "sanctuary"],
        "interests": ["wildlife", "safari", "photography", "nature"],
        "estimated_duration_minutes": 150,
    },
    {
        "id": "ima_keithel",
        "name": "Ima Keithel",
        "district": "Imphal West",
        "latitude": 24.8080,
        "longitude": 93.9350,
        "description": "Historic 500-year-old market operated exclusively by over 4,000 women vendors in central Imphal.",
        "category": ["market", "culture", "heritage"],
        "interests": ["shopping", "handloom", "culture", "street food", "local experience"],
        "estimated_duration_minutes": 90,
    },
    {
        "id": "kangla_fort",
        "name": "Kangla",
        "district": "Imphal West",
        "latitude": 24.8170,
        "longitude": 93.9368,
        "description": "The ancient fortified palace of Manipur's Meitei kings, home to the sacred Kangla Sha dragon-lions and Govindaji temple.",
        "category": ["palace", "fort", "heritage"],
        "interests": ["history", "culture", "monuments", "walking tour"],
        "estimated_duration_minutes": 120,
    },
]


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two coordinates in kilometers using Haversine formula."""
    r = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)


class RecommendationCardService:
    """Orchestrates nearby discovery and enriches destination cards with web search & social data."""

    def __init__(
        self,
        tourism_service: TourismService | None = None,
        scraper_service: WebScraperService | None = None,
        cache_ttl_seconds: int = 3600,
    ):
        self.tourism_service = tourism_service or TourismService()
        self.scraper_service = scraper_service or WebScraperService()
        self.cache_ttl = cache_ttl_seconds
        # In-memory card cache: id -> (timestamp, DestinationCard)
        self._card_cache: dict[str, tuple[float, DestinationCard]] = {}

    async def get_nearby_cards(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 20.0,
        interests: list[str] | None = None,
        limit: int = 5,
    ) -> NearbyCardsResponse:
        """Fetches nearby destinations and enriches each one into a full card."""
        raw_destinations: list[dict[str, Any]] = []

        # Try Supabase RPC first
        try:
            raw_destinations = self.tourism_service.nearby_destinations(
                latitude=latitude,
                longitude=longitude,
                radius_km=radius_km,
            )
        except Exception as exc:
            logger.warning("Supabase nearby_destinations failed (%s), using local catalog.", exc)

        # Fallback to local catalog if database is empty or RPC returns no rows
        if not raw_destinations:
            for item in DEFAULT_DESTINATIONS:
                dist = haversine_distance(
                    latitude, longitude, float(item["latitude"]), float(item["longitude"])
                )
                if dist <= radius_km:
                    dest_copy = dict(item)
                    dest_copy["distance_km"] = dist
                    raw_destinations.append(dest_copy)

        # Sort by distance
        raw_destinations.sort(key=lambda d: float(d.get("distance_km", 999)))

        # Filter by interests if specified
        if interests:
            normalized_interests = {i.lower().strip() for i in interests}
            raw_destinations = [
                d for d in raw_destinations
                if normalized_interests & {str(x).lower().strip() for x in (d.get("interests") or []) + (d.get("category") or [])}
            ] or raw_destinations

        selected = raw_destinations[:limit]

        # Enrich into cards
        cards: list[DestinationCard] = []
        for dest in selected:
            card = await self._build_card(dest, user_lat=latitude, user_lon=longitude)
            cards.append(card)

        return NearbyCardsResponse(
            total=len(cards),
            user_location=Coordinates(latitude=latitude, longitude=longitude),
            radius_km=radius_km,
            cards=cards,
        )

    async def search_cards(
        self,
        query: str,
        user_lat: float | None = None,
        user_lon: float | None = None,
        limit: int = 5,
    ) -> SearchCardsResponse:
        """Searches across destinations and returns matching cards enriched with web & social data."""
        tokens = [t.lower().strip() for t in query.split() if len(t.strip()) > 1]
        matches = []

        for dest in DEFAULT_DESTINATIONS:
            searchable_text = " ".join(
                [
                    dest.get("name", ""),
                    dest.get("district", ""),
                    dest.get("description", ""),
                    " ".join(dest.get("category", [])),
                    " ".join(dest.get("interests", [])),
                ]
            ).lower()

            score = sum(1 for token in tokens if token in searchable_text)
            if score > 0 or not tokens:
                dest_copy = dict(dest)
                if user_lat is not None and user_lon is not None:
                    dest_copy["distance_km"] = haversine_distance(
                        user_lat, user_lon, float(dest["latitude"]), float(dest["longitude"])
                    )
                else:
                    dest_copy["distance_km"] = 0.0
                matches.append((score, dest_copy))

        matches.sort(key=lambda pair: (-pair[0], pair[1]["distance_km"]))
        selected = [m[1] for m in matches[:limit]]

        cards: list[DestinationCard] = []
        for dest in selected:
            card = await self._build_card(dest, user_lat=user_lat, user_lon=user_lon)
            cards.append(card)

        return SearchCardsResponse(
            query=query,
            total=len(cards),
            cards=cards,
        )

    async def get_single_card(
        self,
        place_id: str,
        user_lat: float | None = None,
        user_lon: float | None = None,
    ) -> DestinationCard | None:
        """Retrieves or generates a card for a specific place identifier."""
        norm_id = place_id.lower().replace("-", "_")
        matched = next(
            (d for d in DEFAULT_DESTINATIONS if norm_id in d.get("id", "").lower() or norm_id in d.get("name", "").lower()),
            None,
        )
        if not matched:
            return None

        dest_copy = dict(matched)
        if user_lat is not None and user_lon is not None:
            dest_copy["distance_km"] = haversine_distance(
                user_lat, user_lon, float(matched["latitude"]), float(matched["longitude"])
            )
        else:
            dest_copy["distance_km"] = 0.0

        return await self._build_card(dest_copy, user_lat=user_lat, user_lon=user_lon)

    async def _build_card(
        self,
        dest: dict[str, Any],
        user_lat: float | None = None,
        user_lon: float | None = None,
    ) -> DestinationCard:
        """Builds and enriches a DestinationCard using web scraper & curated knowledge."""
        name = dest.get("name", "Manipur Destination")
        district = dest.get("district", "Manipur")
        dest_id = str(dest.get("id", name.lower().replace(" ", "_")))

        # Check cache
        now = time.time()
        if dest_id in self._card_cache:
            ts, cached_card = self._card_cache[dest_id]
            if now - ts < self.cache_ttl:
                # Update distance if user location changed
                if user_lat is not None and user_lon is not None:
                    cached_card.distance_km = haversine_distance(
                        user_lat, user_lon, cached_card.coordinates.latitude, cached_card.coordinates.longitude
                    )
                    cached_card.subtitle = f"{cached_card.district} • {cached_card.distance_km} km away"
                return cached_card

        # Live scrape & social aggregation
        web_recs, social_recs, curated = await self.scraper_service.search_and_scrape(name, district)

        lat = float(dest.get("latitude", 24.8170))
        lng = float(dest.get("longitude", 93.9368))
        dist_km = float(dest.get("distance_km", 0.0))
        if dist_km == 0.0 and user_lat is not None and user_lon is not None:
            dist_km = haversine_distance(user_lat, user_lon, lat, lng)

        hero_img = dest.get("image_url") or curated.get(
            "hero_image",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        )
        gallery_imgs = curated.get(
            "gallery_images",
            ["https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80"],
        )

        categories = dest.get("category") or curated.get("category", ["heritage", "sightseeing"])
        interests = dest.get("interests") or ["nature", "culture", "photography"]
        badge = curated.get("badge") or (f"{categories[0].title()} Highlight" if categories else "Top Pick")

        actions = [
            CardAction(
                type="navigate",
                label="Get Directions",
                payload={
                    "latitude": lat,
                    "longitude": lng,
                    "name": name,
                    "maps_url": f"https://www.google.com/maps/dir/?api=1&destination={lat},{lng}",
                },
            ),
            CardAction(
                type="share",
                label="Share Card",
                payload={"title": name, "district": district, "distance_km": dist_km},
            ),
            CardAction(
                type="bookmark",
                label="Save to Trip",
                payload={"destination_id": dest_id, "name": name},
            ),
        ]

        card = DestinationCard(
            id=dest_id,
            title=curated.get("title", name),
            subtitle=f"{district} • {dist_km} km away" if dist_km > 0 else district,
            district=district,
            description=dest.get("description") or curated.get("web_summary", ""),
            hero_image=hero_img,
            gallery_images=gallery_imgs,
            coordinates=Coordinates(latitude=lat, longitude=lng),
            distance_km=dist_km,
            estimated_duration_minutes=int(dest.get("estimated_duration_minutes", 90) or 90),
            categories=categories,
            interests=interests,
            badge=badge,
            web_recommendations=web_recs,
            social_recommendations=social_recs,
            actions=actions,
        )

        # Store in cache
        self._card_cache[dest_id] = (now, card)
        return card
