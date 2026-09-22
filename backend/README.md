# Meerup AI & Vision Backend

This backend provides:
1. **Lightweight CPU Landmark Vision Detector**: Recognizes cultural landmarks (such as **Ima Keithel** and **Kangla**) from camera photos using ORB binary feature indexing. It requires **0 MB GPU VRAM**, enabling it to run smoothly alongside a local LLM without performance degradation or memory conflicts.
2. **Culturally Grounded AI Storyteller**: When a landmark is recognized, verified facts and cultural highlights are grounded with the local LLM (e.g. Qwen / Llama on `127.0.0.1:8080/v1`) to generate stories. A fallback narrative is provided if the LLM is temporarily unreachable.
3. **Dual API**: Full **FastAPI REST API** (Port 8000) and **gRPC Service** (Port 50051).

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

## Vision API Endpoints

### 1. `POST /api/vision/recognize`
Upload a photo as multipart form data.
```bash
curl -X POST "http://localhost:8000/api/vision/recognize" \
  -F "file=@dataset/Ima Keithel/ima_keithel_dataset_000.jpg"
```
**Example Response:**
```json
{
  "recognized": true,
  "place_id": "ima_keithel",
  "name": "Ima Keithel",
  "confidence": 0.9603,
  "good_matches": 1258,
  "description": "Ima Keithel (Mother's Market) is an iconic, 500-year-old market in the heart of Imphal...",
  "facts": [
    "Established around the 16th century, it is recognized as Asia's largest all-women market.",
    "Operated exclusively by over 4,000 married women vendors ('Imas' or mothers).",
    "Played a pivotal historical role in the Nupi Lan (Women's War) movements against British colonial policies.",
    "Divided across three major buildings in Khwairamband Keithel: Purana Bazar, Laxmi Bazar, and Linthoingambi Bazar.",
    "Offers authentic Manipuri handloom textiles, Phaneks, Innaphis, fresh organic produce, and traditional handicrafts."
  ],
  "highlights": [
    "World's Largest All-Women Market",
    "500+ Year Living Heritage",
    "Nupi Lan Historic Site",
    "Manipuri Handloom & Craft Hub"
  ],
  "story": "Beneath Imphal's ancient banyan trees, Ima Keithel pulses with 500 years of resilience...",
  "llm_generated": true
}
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
# Run landmark detector & story service unit tests
python -m unittest test/test_vision_landmark.py

# Run FastAPI endpoint tests
python -m unittest test/test_vision_api.py
```
