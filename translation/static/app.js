/**
 * Meerup STS — Minimal English ⟷ Manipuri Speech-to-Speech Engine
 * Powered by Hugging Face & Bhashini via FastAPI & gRPC backend
 */

let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let analyser = null;
let visualizerAnimationId = null;
let activeRecordingLang = null; // 'en' or 'mni'
let currentOutputAudio = null;

// DOM Elements
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelConfigBtn = document.getElementById('cancelConfigBtn');
const configForm = document.getElementById('configForm');

const btnSpeakEn = document.getElementById('btnSpeakEn');
const btnSpeakMni = document.getElementById('btnSpeakMni');
const captionEn = document.getElementById('captionEn');
const captionMni = document.getElementById('captionMni');
const recordingLabel = document.getElementById('recordingLabel');
const recordingText = document.getElementById('recordingText');
const visualizerCanvas = document.getElementById('visualizerCanvas');
const canvasCtx = visualizerCanvas.getContext('2d');

const resultCard = document.getElementById('resultCard');
const resultDirection = document.getElementById('resultDirection');
const resultProvider = document.getElementById('resultProvider');
const resultLatency = document.getElementById('resultLatency');
const sourceTranscript = document.getElementById('sourceTranscript');
const targetTranslation = document.getElementById('targetTranslation');
const btnReplayAudio = document.getElementById('btnReplayAudio');

const textInput = document.getElementById('textInput');
const quickLangSelect = document.getElementById('quickLangSelect');
const btnSendText = document.getElementById('btnSendText');

// Check backend engine status on load
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.status === 'healthy' || data.engine_ready) {
      statusBadge.className = 'status-badge connected';
      statusText.textContent = data.active_engine;
    } else {
      statusBadge.className = 'status-badge warning';
      statusText.textContent = 'Engine Initializing';
    }
  } catch (err) {
    statusBadge.className = 'status-badge checking';
    statusText.textContent = 'Backend Offline';
  }
}

// Modal handling
settingsBtn.addEventListener('click', () => {
  const savedHfToken = localStorage.getItem('meerup_hf_token') || '';
  const tokenInput = document.getElementById('cfgHfToken');
  if (tokenInput) tokenInput.value = savedHfToken;
  settingsModal.classList.remove('hidden');
});

function closeModal() {
  settingsModal.classList.add('hidden');
}

closeModalBtn.addEventListener('click', closeModal);
cancelConfigBtn.addEventListener('click', closeModal);

configForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const tokenInput = document.getElementById('cfgHfToken');
  const hfToken = tokenInput ? tokenInput.value.trim() : '';

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hf_token: hfToken
      })
    });

    const data = await res.json();
    if (data.success) {
      localStorage.setItem('meerup_hf_token', hfToken);
      closeModal();
      checkHealth();
    }
  } catch (err) {
    alert('Failed to save configuration: ' + err.message);
  }
});

// Setup Canvas Visualizer
function drawVisualizer() {
  const width = visualizerCanvas.width;
  const height = visualizerCanvas.height;

  visualizerAnimationId = requestAnimationFrame(drawVisualizer);

  if (!analyser) {
    // Idle wave
    canvasCtx.clearRect(0, 0, width, height);
    canvasCtx.beginPath();
    canvasCtx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
    canvasCtx.lineWidth = 2;
    const time = Date.now() * 0.002;
    for (let x = 0; x < width; x += 4) {
      const y = height / 2 + Math.sin(x * 0.02 + time) * 6;
      if (x === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
    }
    canvasCtx.stroke();
    return;
  }

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  canvasCtx.clearRect(0, 0, width, height);
  canvasCtx.lineWidth = 2.5;

  const gradient = canvasCtx.createLinearGradient(0, 0, width, 0);
  if (activeRecordingLang === 'en') {
    gradient.addColorStop(0, '#00e5ff');
    gradient.addColorStop(1, '#3b82f6');
  } else {
    gradient.addColorStop(0, '#10b981');
    gradient.addColorStop(1, '#00e5ff');
  }

  canvasCtx.strokeStyle = gradient;
  canvasCtx.beginPath();

  const sliceWidth = width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * height) / 2;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.lineTo(width, height / 2);
  canvasCtx.stroke();
}

// Convert AudioBuffer to 16kHz mono WAV format
function audioBufferToWav(buffer) {
  const numOfChan = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const samples = buffer.getChannelData(0);
  const dataSize = samples.length * 2;
  const headerSize = 44;
  const wavBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(wavBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  // format chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, bitDepth, true);
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // write audio samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Audio Recording
async function startRecording(lang) {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true
      }
    });

    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    activeRecordingLang = lang;
    audioChunks = [];

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const rawBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
      stream.getTracks().forEach((track) => track.stop());
      analyser = null;

      const arrayBuffer = await rawBlob.arrayBuffer();
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const wavBlob = audioBufferToWav(decodedBuffer);

      await processSTS(wavBlob, activeRecordingLang);
      activeRecordingLang = null;
    };

    mediaRecorder.start();

    if (lang === 'en') {
      btnSpeakEn.classList.add('recording');
      captionEn.textContent = 'Listening (Tap to Stop)...';
      recordingText.textContent = 'Listening to English...';
    } else {
      btnSpeakMni.classList.add('recording');
      captionMni.textContent = 'Listening (Tap to Stop)...';
      recordingText.textContent = 'Listening to Manipuri...';
    }
    recordingLabel.classList.add('active');
  } catch (err) {
    alert('Microphone error: ' + err.message);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    btnSpeakEn.classList.remove('recording');
    btnSpeakMni.classList.remove('recording');
    captionEn.textContent = 'Speak English';
    captionMni.textContent = 'Speak Manipuri';
    recordingLabel.classList.remove('active');
  }
}

btnSpeakEn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    startRecording('en');
  }
});

btnSpeakMni.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    startRecording('mni');
  }
});

// Demo Test Voice Samples
const btnSampleKangla = document.getElementById('btnSampleKangla');
const btnSampleGreeting = document.getElementById('btnSampleGreeting');

if (btnSampleKangla) {
  btnSampleKangla.addEventListener('click', async () => {
    try {
      const res = await fetch('/static/samples/test_voice_english_kangla.wav');
      const blob = await res.blob();
      await processSTS(blob, 'en');
    } catch (e) {
      alert('Could not load sample audio: ' + e);
    }
  });
}

if (btnSampleGreeting) {
  btnSampleGreeting.addEventListener('click', async () => {
    try {
      const res = await fetch('/static/samples/test_voice_english_greeting.wav');
      const blob = await res.blob();
      await processSTS(blob, 'en');
    } catch (e) {
      alert('Could not load sample audio: ' + e);
    }
  });
}

// Process STS via backend
async function processSTS(audioBlob, sourceLang) {
  const targetLang = sourceLang === 'en' ? 'mni' : 'en';

  resultCard.classList.remove('hidden');
  resultDirection.textContent = sourceLang === 'en' ? 'English ➔ Manipuri' : 'Manipuri ➔ English';
  sourceTranscript.textContent = 'Transcribing speech (ASR)...';
  targetTranslation.textContent = 'Translating & synthesizing voice...';
  resultLatency.textContent = '⚡ ...';

  const formData = new FormData();
  formData.append('file', audioBlob, 'speech.wav');
  formData.append('source_language', sourceLang);
  formData.append('target_language', targetLang);

  try {
    const res = await fetch('/api/sts', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'STS pipeline failed');
    }

    displaySTSResult(data);
  } catch (err) {
    sourceTranscript.textContent = 'Error processing speech';
    targetTranslation.textContent = err.message;
    resultLatency.textContent = '❌ Failed';
  }
}

// Quick Text Translation
btnSendText.addEventListener('click', async () => {
  const text = textInput.value.trim();
  if (!text) return;

  const direction = quickLangSelect.value;
  const sourceLang = direction === 'en_to_mni' ? 'en' : 'mni';
  const targetLang = direction === 'en_to_mni' ? 'mni' : 'en';

  resultCard.classList.remove('hidden');
  resultDirection.textContent = sourceLang === 'en' ? 'English ➔ Manipuri' : 'Manipuri ➔ English';
  sourceTranscript.textContent = text;
  targetTranslation.textContent = 'Translating...';
  resultLatency.textContent = '⚡ ...';

  try {
    // Fast text-only translation (no voice generation overhead)
    const res = await fetch('/api/translate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        source_language: sourceLang,
        target_language: targetLang,
        generate_voice: false
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Translation failed');

    // Show translated text immediately
    displaySTSResult({
      provider: data.provider,
      recognized_text: data.original_text,
      translated_text: data.translated_text,
      audio_base64: '',
      latency_ms: data.latency_ms,
      // Store info for on-demand voice generation
      _source_lang: sourceLang,
      _target_lang: targetLang,
      _translated_text: data.translated_text
    });

    textInput.value = '';
  } catch (err) {
    targetTranslation.textContent = err.message;
    resultLatency.textContent = '❌ Error';
  }
});

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    btnSendText.click();
  }
});

// Display Results & Play Audio
function displaySTSResult(data) {
  sourceTranscript.textContent = data.recognized_text || '—';
  targetTranslation.textContent = data.translated_text || '—';
  resultLatency.textContent = `⚡ ${data.latency_ms}ms`;
  if (resultProvider) {
    resultProvider.textContent = data.provider || 'AI4Bharat Local Indic';
  }

  function playVoice() {
    if (data.audio_base64) {
      const audioUrl = 'data:audio/wav;base64,' + data.audio_base64;
      if (currentOutputAudio) {
        currentOutputAudio.pause();
      }
      currentOutputAudio = new Audio(audioUrl);
      currentOutputAudio.play().catch((err) => {
        console.log('Audio autoplay note:', err);
        if ('speechSynthesis' in window && data.translated_text) {
          const utter = new SpeechSynthesisUtterance(data.translated_text);
          window.speechSynthesis.speak(utter);
        }
      });
    } else if ('speechSynthesis' in window && data.translated_text) {
      const utter = new SpeechSynthesisUtterance(data.translated_text);
      window.speechSynthesis.speak(utter);
    }
  }

  // Auto-play only if audio is already available (from STS speech pipeline)
  if (data.audio_base64) {
    playVoice();
  }

  if (data.translated_text) {
    btnReplayAudio.style.display = 'flex';
    btnReplayAudio.onclick = async () => {
      if (data.audio_base64) {
        // Audio already available, just replay
        playVoice();
      } else {
        // Generate voice on-demand when Play is clicked
        btnReplayAudio.textContent = '🔄 Generating...';
        try {
          const voiceRes = await fetch('/api/translate-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: data._translated_text || data.translated_text,
              source_language: data._target_lang || 'mni',
              target_language: data._target_lang || 'mni',
              generate_voice: true
            })
          });
          const voiceData = await voiceRes.json();
          if (voiceData.audio_base64) {
            data.audio_base64 = voiceData.audio_base64;
            playVoice();
          }
        } catch (err) {
          console.log('Voice generation error:', err);
        }
        btnReplayAudio.textContent = '🔊';
      }
    };
  } else {
    btnReplayAudio.style.display = 'none';
  }
}

// Initialize
checkHealth();
drawVisualizer();
