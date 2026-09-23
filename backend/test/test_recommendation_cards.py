"""Tests for nearby recommendations, web scraping, and card generation."""

import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.tourism.card_service import haversine_distance
from app.tourism.web_scraper import WebScraperService


class RecommendationCardsTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_haversine_distance(self):
        # Distance between Kangla (24.8170, 93.9368) and Matai Garden (24.8560, 93.9140) is ~4.9 km
        dist = haversine_distance(24.8170, 93.9368, 24.8560, 93.9140)
        self.assertGreaterEqual(dist, 4.0)
        self.assertLessEqual(dist, 6.0)

    async def test_web_scraper_service(self):
        scraper = WebScraperService(timeout=3.0)
        web_recs, social_recs, curated = await scraper.search_and_scrape("Andro", "Imphal East")

        # Verify web recommendations
        self.assertIsNotNone(web_recs.rating)
        self.assertGreaterEqual(web_recs.rating, 4.0)
        self.assertTrue(len(web_recs.summary) > 0)
        self.assertTrue(len(web_recs.top_search_snippets) > 0)
        self.assertTrue(len(web_recs.best_time_to_visit) > 0)

        # Verify social media recommendations
        self.assertGreaterEqual(social_recs.trending_score, 80)
        self.assertTrue(len(social_recs.instagram_spots) >= 2)
        self.assertTrue(len(social_recs.youtube_vlogs) >= 1)
        self.assertTrue(len(social_recs.traveler_tips) >= 2)
        self.assertTrue(len(social_recs.hashtags) >= 2)

    def test_get_nearby_cards_api(self):
        response = self.client.get(
            "/api/recommendations/nearby?latitude=24.8170&longitude=93.9368&radius_km=25.0&limit=3"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(data["total"], 0)
        self.assertTrue(len(data["cards"]) > 0)

        first_card = data["cards"][0]
        # Verify card structure
        self.assertIn("id", first_card)
        self.assertIn("title", first_card)
        self.assertIn("subtitle", first_card)
        self.assertIn("description", first_card)
        self.assertIn("hero_image", first_card)
        self.assertTrue(first_card["hero_image"].startswith("http"))
        self.assertIn("coordinates", first_card)
        self.assertIn("distance_km", first_card)
        self.assertIn("actions", first_card)
        self.assertTrue(len(first_card["actions"]) >= 2)

        # Verify web recommendations within card
        web = first_card["web_recommendations"]
        self.assertIn("rating", web)
        self.assertIn("summary", web)
        self.assertIn("top_search_snippets", web)

        # Verify social recommendations within card
        social = first_card["social_recommendations"]
        self.assertIn("trending_score", social)
        self.assertIn("instagram_spots", social)
        self.assertIn("youtube_vlogs", social)
        self.assertIn("traveler_tips", social)
        self.assertIn("hashtags", social)

    def test_search_cards_api(self):
        response = self.client.get("/api/recommendations/search?q=Andro")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["query"], "Andro")
        self.assertGreaterEqual(data["total"], 1)

        card_titles = [c["title"].lower() for c in data["cards"]]
        self.assertTrue(any("andro" in t for t in card_titles))

    def test_single_card_api(self):
        response = self.client.get("/api/recommendations/loktak_lake/card")
        self.assertEqual(response.status_code, 200)
        card = response.json()
        self.assertIn("Loktak", card["title"])
        self.assertGreaterEqual(card["web_recommendations"]["rating"], 4.5)
        self.assertTrue(len(card["social_recommendations"]["instagram_spots"]) > 0)

    def test_single_card_not_found(self):
        response = self.client.get("/api/recommendations/non_existent_xyz/card")
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
