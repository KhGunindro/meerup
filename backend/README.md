# Meerup AI, Vision & Tourism Backend

This backend provides:
1. **Lightweight CPU Landmark Vision Detector**: Recognizes cultural landmarks (such as **Ima Keithel** and **Kangla**) from camera photos using ORB binary feature indexing. It requires **0 MB GPU VRAM**, enabling it to run smoothly alongside a local LLM without performance degradation or memory conflicts.
2. **Culturally Grounded AI Storyteller**: When a landmark is recognized, verified facts and cultural highlights are grounded with the local LLM (e.g. Qwen / Llama on `127.0.0.1:8080/v1`) to generate stories. A fallback narrative is provided if the LLM is temporarily unreachable.
3. **Web-Scraped Nearby Recommendations & Social Media Cards**: Takes GPS coordinates or search queries and returns rich destination cards formatted specifically for UI display underneath chat/map. Cards include live Google search snippets, ratings, opening hours, Instagram photo spots, YouTube vlogs, community tips, and directions.
4. **Dual API**: Full **FastAPI REST API** (Port 8000) and **gRPC Service** (Port 50051).

---

## Quickstart

### 1. Environment & Setup
From `backend/`:
```bash
# Using uv (or your python environment)
uv sync
```

### 2. Training / Updating the Landmark Model
The dataset is located in `backend/dataset/`:
- `dataset/Ima Keithel/` (200 reference photos)
- `dataset/Kangla/` (52 reference photos)

To build or update the compressed feature index:
```bash
python scripts/train_landmark_detector.py
```
This generates `models/landmark_orb_index.npz` (~5.4 MB) containing all indexed references.

### 3. Run FastAPI REST API
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger documentation is available at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 4. Run gRPC Server (Optional)
```bash
python -m app.grpc.server
```
Listens on `0.0.0.0:50051`.

---

## Recommendations & Card API Endpoints

### 1. `GET /api/recommendations/nearby`
Returns nearby destinations from user's coordinates formatted as rich cards underneath chat/map:
```bash
curl -s "http://localhost:8000/api/recommendations/nearby?latitude=24.8170&longitude=93.9368&radius_km=25&limit=3" | jq .
```
**Example Card Structure:**
```json
{
  "total": 3,
  "user_location": {"latitude": 24.817, "longitude": 93.9368},
  "radius_km": 25.0,
  "cards": [
    {
      "id": "andro_village",
      "title": "Andro Ancient Cultural Village",
      "subtitle": "Imphal East • 13.5 km away",
      "district": "Imphal East",
      "description": "Ancient village famous for its traditional coil pottery, the Mutua Cultural Museum, and sacred fire temple.",
      "hero_image": "https://images.unsplash.com/photo-1598971861713-54ad16a7e72e?auto=format&fit=crop&w=800&q=80",
      "gallery_images": ["https://..."],
      "coordinates": {"latitude": 24.7773, "longitude": 94.0632},
      "distance_km": 13.52,
      "estimated_duration_minutes": 120,
      "categories": ["village", "culture", "heritage"],
      "badge": "Top Cultural Heritage Pick",
      "web_recommendations": {
        "rating": 4.6,
        "review_count": 380,
        "summary": "Andro is renowned for its centuries-old coil pottery (Charai Taba)...",
        "best_time_to_visit": "October to March (10:00 AM - 4:30 PM)",
        "entry_fee": "₹20 for adults, ₹50 for museum entry",
        "opening_hours": "09:00 AM – 05:00 PM daily",
        "top_search_snippets": [
          {
            "title": "Things to Do and Places to Visit in Andro | Ghumakkadi.com",
            "snippet": "Surrounded by green hills and local homesteads, Andro provides an authentic glimpse...",
            "url": "https://www.ghumakkadi.com/andro-tourism",
            "source": "Google / Web Search"
          }
        ]
      },
      "social_recommendations": {
        "trending_score": 93,
        "instagram_spots": [
          "Santhei Natural Park scenic lake reflection",
          "Traditional coiled pottery drying rows outside artisan homes",
          "Mutua Heritage Museum wood carvings and thatch huts",
          "The sacred ancestral fire sanctuary"
        ],
        "youtube_vlogs": [
          {
            "title": "Exploring the 1000-Year-Old Sacred Fire Village in Manipur | Andro Travel Guide",
            "channel": "Mountain Trekker",
            "url": "https://www.youtube.com/results?search_query=Andro+Manipur+travel+vlog"
          }
        ],
        "traveler_tips": [
          "Buy handcrafted clay pots and miniature terracotta souvenirs directly from local artisan mothers.",
          "Visit early morning to catch soft golden light over the surrounding Nongmaiching foothills.",
          "Taste traditional Yu produced using age-old fermentation recipes."
        ],
        "hashtags": ["#AndroManipur", "#CulturalHeritage", "#AncientPottery", "#IncredibleManipur"]
      },
      "actions": [
        {
          "type": "navigate",
          "label": "Get Directions",
          "payload": {
            "latitude": 24.7773,
            "longitude": 94.0632,
            "name": "Andro",
            "maps_url": "https://www.google.com/maps/dir/?api=1&destination=24.7773,94.0632"
          }
        },
        {"type": "share", "label": "Share Card"},
        {"type": "bookmark", "label": "Save to Trip"}
      ]
    }
  ]
}
```

### 2. `GET /api/recommendations/search`
Search across Manipur destinations by keyword and receive enriched recommendation cards:
```bash
curl -s "http://localhost:8000/api/recommendations/search?q=waterfall" | jq .
```

### 3. `GET /api/recommendations/{place_id}/card`
Fetch a specific destination card by ID:
```bash
curl -s "http://localhost:8000/api/recommendations/loktak_lake/card" | jq .
```

---

## Vision API Endpoints

### 1. `POST /api/vision/recognize`
Upload a photo as multipart form data.
```bash
curl -X POST "http://localhost:8000/api/vision/recognize" \
  -F "file=@dataset/Ima Keithel/ima_keithel_dataset_000.jpg"
```

### 2. `POST /api/vision/recognize-base64`
Send base64 encoded photo (ideal for mobile React Native camera captures):
```bash
curl -X POST "http://localhost:8000/api/vision/recognize-base64" \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "<base64_string>"}'
```

### 3. `GET /api/vision/places`
Get catalog of all supported landmarks with descriptions and cultural facts.

### 4. `GET /api/vision/status`
Check detector readiness, total indexed references, and local LLM connectivity.

### 5. `POST /api/vision/train`
Trigger programmatic retraining / reindexing of the dataset directory.

---

## Running Automated Tests
```bash
# Run all tests (Vision, Storytelling & Recommendation Cards)
python -m unittest discover -s test
```
