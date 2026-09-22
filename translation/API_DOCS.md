# Meerup Translation Engine — API Documentation

Comprehensive API documentation for the **English ⟷ Manipuri (Meeteilon ꯃꯤꯇꯩ ꯃꯌꯦꯛ)** Neural Translation, Speech-to-Text (ASR), Text-to-Speech (TTS), and Speech-to-Speech (STS) services.

---

## 🌐 Server Endpoints & Ports

| Interface | Protocol | Default Host & Port | Base URL |
|---|---|---|---|
| **REST / HTTP Gateway** | HTTP/1.1 & HTTP/2 | `0.0.0.0:8000` | `http://localhost:8000` |
| **Interactive Web UI** | HTTP HTML | `0.0.0.0:8000` | `http://localhost:8000/` |
| **OpenAPI / Swagger** | OpenAPI 3.0 | `0.0.0.0:8000` | `http://localhost:8000/docs` |
| **gRPC Microservice** | HTTP/2 gRPC | `0.0.0.0:50051` | `localhost:50051` |

> [!NOTE]
> All endpoints support CORS (`*`) and are ready for direct connection from mobile apps (React Native, Expo, Flutter, iOS Swift, Android Kotlin) and web browsers.

---

## 1. Speech-to-Text (ASR / Voice Transcription)

Transcribes recorded speech into text.
- **English ASR**: `openai/whisper-tiny.en` (Apple Silicon MPS accelerated)
- **Manipuri ASR**: `ai4bharat/indic-conformer-600m-multilingual` (Meetei Mayek script output)

### A. Multipart File Upload: `POST /api/transcribe`

**Content-Type**: `multipart/form-data`

#### Form Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `file` | Binary File | **Yes** | — | Audio file (`.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`). 16kHz mono recommended. |
| `source_language` | String | No | `"en"` | Source language code: `"en"` (English) or `"mni"` (Manipuri). |

#### cURL Example
```bash
curl -X POST http://localhost:8000/api/transcribe \
  -F "file=@sample_voice.wav" \
  -F "source_language=en"
```

#### JSON Response (`200 OK`)
```json
{
  "success": true,
  "source_language": "en",
  "text": "Where is Kangla Fort located?",
  "provider": "Whisper (MPS)"
}
```

---

### B. Base64 Audio Payload: `POST /api/transcribe-json`

Ideal for mobile clients (React Native `react-native-audio-recorder-player` or Expo `expo-av`) that record and produce Base64 audio in memory.

**Content-Type**: `application/json`

#### Request Body
```json
{
  "audio_base64": "UklGRi4AAABXQVZFZm10IBAAAAABAAEA...",
  "source_language": "mni"
}
```

#### cURL Example
```bash
curl -X POST http://localhost:8000/api/transcribe-json \
  -H "Content-Type: application/json" \
  -d '{
    "audio_base64": "UklGRi4AAABXQVZFZm10...",
    "source_language": "mni"
  }'
```

#### JSON Response (`200 OK`)
```json
{
  "success": true,
  "source_language": "mni",
  "text": "ꯀꯡꯂꯥ ꯀꯗꯥꯏꯗ ꯂꯩꯕꯒꯦ?",
  "provider": "IndicConformer (Local ONNX)"
}
```

---

## 2. Text Translation: `POST /api/translate-text`

Translates text bidirectionally between English and Manipuri (Meetei Mayek ꯃꯤꯇꯩ ꯃꯌꯦꯛ) using **AI4Bharat IndicTrans2**. Optionally synthesizes voice audio in the target language.

**Content-Type**: `application/json`

### Request Parameters
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `text` | String | **Yes** | — | Input sentence or text to translate. |
| `source_language` | String | No | `"en"` | Source language: `"en"` or `"mni"`. |
| `target_language` | String | No | `"mni"` | Target language: `"mni"` or `"en"`. |
| `voice_gender` | String | No | `"female"` | `"female"` or `"male"`. |
| `generate_voice` | Boolean | No | `true` | `false` = fast text-only translation (0ms TTS overhead). `true` = returns Base64 target voice. |

### A. Fast Text-Only Translation Example

#### Request
```bash
curl -X POST http://localhost:8000/api/translate-text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Welcome to Manipur. Have you eaten?",
    "source_language": "en",
    "target_language": "mni",
    "generate_voice": false
  }'
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "provider": "AI4Bharat IndicTrans2",
  "original_text": "Welcome to Manipur. Have you eaten?",
  "translated_text": "ꯃꯅꯤꯄꯨꯔꯗ ꯇꯔꯥꯝꯅ ꯑꯣꯛꯆꯔꯤ꯫ ꯆꯥꯛ ꯆꯥꯕꯤꯔꯕ꯭ꯔꯥ?",
  "audio_base64": "",
  "latency_ms": 0
}
```

### B. Translation + Voice Synthesis Example

#### Request
```bash
curl -X POST http://localhost:8000/api/translate-text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how are you?",
    "source_language": "en",
    "target_language": "mni",
    "voice_gender": "female",
    "generate_voice": true
  }'
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "provider": "AI4Bharat IndicTrans2",
  "original_text": "Hello, how are you?",
  "translated_text": "ꯈꯨꯔꯨꯝꯖꯔꯤ, ꯀꯃꯧ ꯇꯧꯔꯤ?",
  "audio_base64": "UklGRtS... (Base64 WAV string)",
  "audio_format": "wav",
  "latency_ms": 114
}
```

---

## 3. Text-to-Speech (TTS Voice Synthesis): `POST /api/tts`

Synthesizes high-fidelity speech from text using local neural synthesis with Manipuri phonological acoustic adaptation.

**Content-Type**: `application/json`

### Request Parameters
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `text` | String | **Yes** | — | Text to vocalize (Meetei Mayek or English). |
| `target_language` | String | No | `"mni"` | Language code: `"mni"` or `"en"`. |
| `voice_gender` | String | No | `"female"` | `"female"` or `"male"`. |
| `return_binary` | Boolean | No | `false` | `true` = stream raw binary `audio/wav` bytes. `false` = return JSON with Base64 audio. |

### A. Direct Audio Streaming (Save to .wav or Play in `<audio>`)
```bash
curl -X POST http://localhost:8000/api/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "ꯃꯅꯤꯄꯨꯔꯗ ꯇꯔꯥꯝꯅ ꯑꯣꯛꯆꯔꯤ",
    "target_language": "mni",
    "return_binary": true
  }' --output manipuri_speech.wav
```

### B. JSON Base64 Response
```bash
curl -X POST http://localhost:8000/api/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Welcome to Manipur",
    "target_language": "en",
    "return_binary": false
  }'
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "target_language": "en",
  "audio_base64": "UklGRtS...",
  "audio_format": "wav",
  "bytes": 142800
}
```

---

## 4. End-to-End Speech-to-Speech (STS) Translation

Receives spoken audio in the source language, transcribes it, translates it to the target language, and returns synthesized spoken audio in the target language.

### A. Multipart File Upload: `POST /api/sts`

**Content-Type**: `multipart/form-data`

#### Form Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `file` | Binary File | **Yes** | — | Input audio file (`.wav`, `.mp3`, etc.). |
| `source_language` | String | No | `"en"` | `"en"` or `"mni"`. |
| `target_language` | String | No | `"mni"` | `"mni"` or `"en"`. |
| `voice_gender` | String | No | `"female"` | `"female"` or `"male"`. |

#### cURL Example
```bash
curl -X POST http://localhost:8000/api/sts \
  -F "file=@tourist_question.wav" \
  -F "source_language=en" \
  -F "target_language=mni" \
  -F "voice_gender=female"
```

#### JSON Response (`200 OK`)
```json
{
  "success": true,
  "provider": "AI4Bharat Indic Pipeline (Local)",
  "recognized_text": "Good morning. Where is the bus station?",
  "translated_text": "ꯑꯌꯨꯛꯀꯤ ꯈꯨꯔꯨꯝꯖꯔꯤ꯫ ꯕꯁ ꯁ꯭ꯇꯦꯁꯟ ꯀꯗꯥꯏꯗ ꯂꯩꯕꯒꯦ?",
  "audio_base64": "UklGRg7... (Base64 audio string)",
  "audio_format": "wav",
  "latency_ms": 1380
}
```

---

### B. Base64 Audio Payload: `POST /api/sts-json`

**Content-Type**: `application/json`

#### Request Body
```json
{
  "audio_base64": "UklGRi4AAABXQVZFZm10IBAAAAABAAEA...",
  "source_language": "en",
  "target_language": "mni",
  "voice_gender": "female"
}
```

---

## 5. Health & Diagnostic Check: `GET /api/health`

Returns engine operational status, loaded local models, acceleration hardware, and supported language mappings.

```bash
curl -s http://localhost:8000/api/health
```

#### JSON Response (`200 OK`)
```json
{
  "status": "healthy",
  "engine_ready": true,
  "active_engine": "AI4Bharat Local Offline Engine (Apple Silicon GPU)",
  "models": {
    "asr_en": "openai/whisper-tiny.en (Local MPS)",
    "asr_mni": "ai4bharat/indic-conformer-600m-multilingual (Local ONNX)",
    "nmt_en_indic": "ai4bharat/indictrans2-en-indic-dist-200M (Local MPS)",
    "nmt_indic_en": "ai4bharat/indictrans2-indic-en-dist-200M (Local MPS)",
    "tts": "Local Neural Speech Synthesizer"
  },
  "languages": [
    "en (English)",
    "mni (Manipuri / Meeteilon ꯃꯤꯇꯩ ꯃꯌꯦꯛ)"
  ]
}
```

---

## 6. Runtime Configuration: `POST /api/config`

Updates the local Hugging Face token dynamically in memory.

**Content-Type**: `application/json`

```bash
curl -X POST http://localhost:8000/api/config \
  -H "Content-Type: application/json" \
  -d '{"hf_token": "hf_your_new_token_here"}'
```

---

## 7. gRPC API Interface

- **Port**: `50051`
- **Proto definition**: [`proto/sts.proto`](file:///Users/yaiphaba/Desktop/All%20File/Meerup/translation/proto/sts.proto)
- **Service**: `SpeechTranslationService`

### Methods

| RPC Method | Request Type | Response Type | Description |
|---|---|---|---|
| `TranslateSpeech` | `SpeechTranslationRequest` | `SpeechTranslationResponse` | Audio bytes in -> ASR -> NMT -> TTS audio bytes out. |
| `TranslateText` | `TextTranslationRequest` | `TextTranslationResponse` | Text in -> NMT -> TTS audio bytes out. |
| `CheckHealth` | `HealthCheckRequest` | `HealthCheckResponse` | Verifies microservice connectivity. |

### Python Client Example
```python
import grpc
from proto import sts_pb2, sts_pb2_grpc

channel = grpc.insecure_channel("localhost:50051")
stub = sts_pb2_grpc.SpeechTranslationServiceStub(channel)

# Translate Text
response = stub.TranslateText(
    sts_pb2.TextTranslationRequest(
        text="Where is Loktak Lake?",
        source_language="en",
        target_language="mni",
        voice_gender="female"
    )
)
print("Manipuri Translation:", response.translated_text)
with open("loktak.wav", "wb") as f:
    f.write(response.audio_content)
```

---

## 8. Mobile App Integration (React Native / Expo Example)

```javascript
// 1. Text Translation + Voice
async function translateSentence(text, sourceLang = 'en', targetLang = 'mni') {
  const response = await fetch('http://<YOUR_MAC_OR_SERVER_IP>:8000/api/translate-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: text,
      source_language: sourceLang,
      target_language: targetLang,
      generate_voice: true
    })
  });
  const data = await response.json();
  console.log('Translated:', data.translated_text);
  // Audio: 'data:audio/wav;base64,' + data.audio_base64
  return data;
}

// 2. Speech-to-Speech (STS) with recorded Base64 audio
async function translateSpeech(audioBase64, sourceLang = 'en', targetLang = 'mni') {
  const response = await fetch('http://<YOUR_MAC_OR_SERVER_IP>:8000/api/sts-json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio_base64: audioBase64,
      source_language: sourceLang,
      target_language: targetLang,
      voice_gender: 'female'
    })
  });
  return await response.json();
}
```
