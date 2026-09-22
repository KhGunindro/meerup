# Meerup (ꯃꯤꯔꯨꯞ) — Smart Tourism & Cultural Companion

> **An AI-powered mobile and offline intelligence platform for exploring Manipur.**  
> Features real-time **English ⟷ Manipuri (Meeteilon ꯃꯤꯇꯩ ꯃꯌꯦꯛ)** Speech-to-Speech translation, smart Point of Interest (POI) exploration, cultural guidance, and safety assistance.

---

## 🏛️ System Architecture

Meerup is architected as a modular monorepo containing three core subsystems:

```
                                  ┌────────────────────────┐
                                  │   Tourist / User       │
                                  └───────────┬────────────┘
                                              │
                                              ▼
                        ┌──────────────────────────────────────────┐
                        │   📱 Frontend Client (React Native/Expo) │
                        │   • Interactive Map & GPS Navigation     │
                        │   • Voice Assistant & AI Chat UI         │
                        │   • Offline POI Cache & SOS Panel        │
                        └─────────────┬──────────────┬─────────────┘
                                      │              │
                   REST / gRPC Audio  │              │  gRPC POI Queries
                   & Text Translation │              │  & Itinerary
                                      ▼              ▼
         ┌─────────────────────────────────┐   ┌─────────────────────────────────┐
         │  🎙️ Translation & Speech Engine  │   │  ⚙️ Core Backend Services       │
         │  (translation/)                 │   │  (backend/)                     │
         │  • ASR: IndicConformer & Whisper│   │  • Tourism POI Database         │
         │  • NMT: IndicTrans2 (En ⟷ Mni)  │   │  • Supabase Spatial Queries     │
         │  • TTS: Neural Manipuri Voice   │   │  • Nearby Destination gRPC      │
         │  • Ports: 8000 (REST) & 50051   │   │  • Cultural & Etiquette RAG     │
         └─────────────────────────────────┘   └─────────────────────────────────┘
```

---

## 📂 Subsystems Overview

### 1. 🎙️ [Translation & Speech Engine (`translation/`)](./translation)
A 100% offline, Apple Silicon GPU (MPS)-accelerated Speech-to-Speech (STS), Speech-to-Text (ASR), Text Translation (NMT), and Voice Synthesis (TTS) engine.
- **Languages**: Bidirectional English (`en`) ⟷ Manipuri (`mni` in Meetei Mayek ꯃꯤꯇꯩ ꯃꯌꯦꯛ).
- **Speech Recognition (ASR)**: 
  - English: `openai/whisper-tiny.en` (Apple Silicon MPS).
  - Manipuri: `ai4bharat/indic-conformer-600m-multilingual` (Local ONNX Meetei Mayek script).
- **Neural Machine Translation (NMT)**: `ai4bharat/indictrans2-en-indic-dist-200M` and `ai4bharat/indictrans2-indic-en-dist-200M`.
- **Manipuri Voice Synthesis (TTS)**: Custom neural speech synthesis tuned for authentic Manipuri phonology (preserves open-syllable markers like `-da`, `-na`, `-ba`, `-le`, natural pitch contour, and smooth nasalization).
- **Dual Protocols**:
  - **FastAPI REST API**: Port `8000` (with live browser waveform visualizer at `http://localhost:8000`).
  - **gRPC Microservice**: Port `50051` (for low-latency mobile streaming).
- 📖 **Full API Reference**: [**`translation/API_DOCS.md`**](./translation/API_DOCS.md).

---

### 2. 📱 [Mobile Frontend Client (`frontend/`)](./frontend)
Cross-platform mobile application built with **React Native** and **Expo Router** (SDK 57 / React 19).
- **Map & Destination Guide**: Browse nearby cultural landmarks, lakes, sacred groves, and historical monuments.
- **Voice & Chat Assistant**: Real-time voice translation interface with live audio capture and playback.
- **Emergency & SOS**: Rapid emergency contact panel and safety tools.
- **Offline Cache**: Works seamlessly in low-connectivity areas across Manipur.

---

### 3. ⚙️ [Core Tourism Backend (`backend/`)](./backend)
Python backend microservice managing tourism data, spatial geometry, and user preferences.
- **Database**: Integrated with **Supabase / PostgreSQL** for spatial tourism points of interest.
- **gRPC Service**: High-performance `nearby_destinations()` RPC for fast location lookups.
- **Cultural Knowledge Base**: Curated local etiquette, customs, and visitor guidelines for Manipur heritage sites.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: 3.9+ (with Apple Silicon GPU support on macOS or CUDA on Linux).
- **Node.js**: 18+ and npm.
- **Expo CLI**: `npx expo` for mobile testing.

---

### Step 1: Start the Translation & Voice Engine

```bash
# Navigate to translation service
cd translation

# Activate virtual environment
source ../venv/bin/activate

# Install dependencies (if first time)
pip install -r requirements.txt

# Download model weights to local cache (first time only)
python download_models.py

# Launch FastAPI & gRPC server
uvicorn main:app --host 0.0.0.0 --port 8000
```

- **Web Visualizer & Swagger**: [http://localhost:8000](http://localhost:8000) (Swagger at `/docs`)
- **gRPC Port**: `50051`

---

### Step 2: Start the Core Tourism Backend

```bash
cd backend

# Configure environment variables (.env with Supabase credentials)
# Start gRPC Tourism Server
python -m app.grpc.server
```

---

### Step 3: Run the Mobile Application

```bash
cd frontend

# Install packages
npm install

# Launch Expo development server
npx expo start
```

Press **`i`** for iOS Simulator, **`a`** for Android Emulator, or scan the QR code with the **Expo Go** app on your physical device.

---

## 📡 Key API Endpoints (Translation Service)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/transcribe` | `POST` | Upload audio file (`.wav`, `.mp3`) → Transcribed text. |
| `/api/transcribe-json` | `POST` | Send Base64 audio → Transcribed text (for mobile recording). |
| `/api/translate-text` | `POST` | English ⟷ Manipuri text translation + optional voice audio. |
| `/api/tts` | `POST` | Text-to-Speech voice synthesis (stream raw `.wav` or Base64). |
| `/api/sts` | `POST` | End-to-end Speech-to-Speech translation (Audio in → Translated audio out). |
| `/api/health` | `GET` | Health status, active models, and hardware acceleration status. |

For complete request/response schemas and curl examples, see [**`translation/API_DOCS.md`**](./translation/API_DOCS.md).

---

## 🛠️ Repository Structure

```
Meerup/
├── README.md                      # Project master documentation (this file)
├── .gitignore                     # Repository git ignore rules
│
├── translation/                   # 🎙️ Translation & Speech Microservice
│   ├── API_DOCS.md                # Full REST & gRPC API reference
│   ├── README.md                  # Detailed translation service docs
│   ├── main.py                    # FastAPI Gateway (port 8000)
│   ├── grpc_server.py             # gRPC Server (port 50051)
│   ├── grpc_client_example.py     # Sample gRPC client tester
│   ├── download_models.py         # Offline model weight downloader
│   ├── requirements.txt           # Python packages
│   ├── services/
│   │   ├── local_indic_engine.py  # ASR, NMT, and Neural TTS pipeline
│   │   └── sts_engine.py          # Unified dispatcher
│   ├── proto/                     # Protobuf definitions (sts.proto)
│   ├── static/                    # Built-in Web UI & audio visualizer
│   └── test_sts_pipeline.py       # End-to-end testing script
│
├── frontend/                      # 📱 React Native / Expo Mobile Client
│   ├── app.json                   # Expo application configuration
│   ├── package.json               # Node dependencies
│   ├── src/                       # Screens, navigation, components
│   └── assets/                    # Icons, splash screens, and images
│
└── backend/                       # ⚙️ Core Tourism & POI Backend
    ├── requirements.txt           # Backend dependencies
    └── app/
        ├── grpc/                  # Destination gRPC service
        ├── tourism/               # POI and itinerary logic
        └── db/                    # Supabase database client
```

---

## 🤝 Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./frontend/LICENSE) file for details.
