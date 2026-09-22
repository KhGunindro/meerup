# Meerup — Neural Translation & Speech Engine (English ⟷ Manipuri)

A high-performance, 100% offline Speech-to-Speech (STS), Speech-to-Text (ASR), Text Translation (NMT), and Text-to-Speech (TTS) engine built for **English ⟷ Manipuri (Meeteilon ꯃꯤꯇꯩ ꯃꯌꯦꯛ)**.

Powered by state-of-the-art **AI4Bharat Indic** models with full **Apple Silicon GPU (MPS)** acceleration.

---

## 🚀 Key Features

- **Bidirectional NMT**: English ⟷ Manipuri translation using `ai4bharat/indictrans2-en-indic-dist-200M` and `ai4bharat/indictrans2-indic-en-dist-200M`.
- **Hybrid ASR**:
  - English: `openai/whisper-tiny.en` (Apple Silicon MPS).
  - Manipuri: `ai4bharat/indic-conformer-600m-multilingual` (Local ONNX Meetei Mayek script recognition).
- **Acoustic Manipuri Voice Synthesis**: Neural speech synthesis customized for authentic Manipuri phonology (preserves open-syllable markers like `-da`, `-na`, `-ba`, `-le`, smoothly handles nasalization, and natural prosody).
- **Dual API Protocols**:
  - **FastAPI REST Gateway**: Port `8000` (CORS enabled, JSON and multipart file upload support).
  - **gRPC Microservice**: Port `50051` (low-latency streaming/RPC).
- **Modern Web Interface**: Built-in visualizer with live waveform and mic recording at `http://localhost:8000`.

---

## 📁 Directory Structure

```
translation/
├── API_DOCS.md                     # Comprehensive REST & gRPC API reference
├── README.md                       # This documentation
├── main.py                         # FastAPI web & REST gateway
├── grpc_server.py                  # gRPC server implementation
├── grpc_client_example.py          # Sample gRPC client tester
├── download_models.py              # Script to pull model weights to local cache
├── requirements.txt                # Python dependencies
├── .env                            # Environment variables (tokens, ports)
├── services/
│   ├── local_indic_engine.py       # Core offline pipeline (ASR, NMT, TTS)
│   └── sts_engine.py               # Clean dispatcher interface
├── proto/
│   ├── sts.proto                   # Protocol Buffer service schema
│   ├── sts_pb2.py                  # Generated Protobuf code
│   └── sts_pb2_grpc.py             # Generated gRPC stubs
├── static/
│   ├── index.html                  # Web client UI
│   ├── app.js                      # Browser audio recorder & client logic
│   └── style.css                   # Responsive dark-theme styling
└── test_sts_pipeline.py            # Local pipeline test script
```

---

## ⚡ Quick Start

### 1. Environment Setup

Ensure you are using Python 3.9+ with virtualenv:

```bash
# From workspace root:
source venv/bin/activate

# Or install dependencies:
pip install -r translation/requirements.txt
```

### 2. Download Model Weights (First Time Setup)

Run the automated model downloader:

```bash
cd translation
python download_models.py
```

### 3. Start the Server

```bash
cd translation
uvicorn main:app --host 0.0.0.0 --port 8000
```

The server starts both:
- **FastAPI HTTP REST Gateway**: `http://localhost:8000`
- **Interactive UI**: Open `http://localhost:8000` in your browser.
- **gRPC Server**: `localhost:50051`

---

## 🧪 Testing

### Test Local Translation & Voice Synthesis:
```bash
python test_mni_voice.py
```

### Test End-to-End Speech-to-Speech (STS):
```bash
python test_sts_pipeline.py
```

### Test gRPC Server:
```bash
python grpc_client_example.py
```

---

## 📖 API Documentation

For complete endpoint specifications, JSON payload schemas, headers, cURL examples, and React Native / Expo integration code, refer to [**`API_DOCS.md`**](file:///Users/yaiphaba/Desktop/All%20File/Meerup/translation/API_DOCS.md).
