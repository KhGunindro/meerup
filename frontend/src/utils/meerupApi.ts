import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Determine host: Physical device via Expo uses Metro host IP, emulator uses 10.0.2.2
const getHost = (): string => {
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    return hostUri.split(':')[0];
  }
  // Default to LAN IP if on physical device / network, fallback to emulator
  return '192.168.68.59';
};

const HOST = getHost();

export const NGROK_TRANSLATION_URL = 'https://nonexterminative-lucinda-gentlemanlike.ngrok-free.dev';

// Live ngrok tunnel for Translation & Speech-to-Speech
export const TRANSLATION_API_BASE_URL =
  process.env.EXPO_PUBLIC_TRANSLATION_URL || NGROK_TRANSLATION_URL;

export const BACKEND_API_BASE_URL = `http://${HOST}:8001`;

// ─── Backend URL Configuration ────────────────────────────────────────────────
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location?.hostname
    ? `http://${window.location.hostname}:8001`
    : BACKEND_API_BASE_URL);

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface ApiResponse {
  text?: string;
  originalText?: string;
  audioBase64?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  error?: string;
  provider?: string;
  latencyMs?: number;
}

export interface LandmarkResponse {
  recognized: boolean;
  place_id: string;
  name: string;
  confidence: number;
  good_matches: number;
  description: string;
  facts: string[];
  highlights: string[];
  story: string;
  llm_generated: boolean;
}

export interface WebSearchSnippet {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export interface WebRecommendations {
  rating: number | null;
  review_count: number | null;
  summary: string;
  best_time_to_visit: string;
  entry_fee: string;
  opening_hours: string;
  top_search_snippets: WebSearchSnippet[];
}

export interface YouTubeVlog {
  title: string;
  channel: string;
  url: string;
}

export interface SocialRecommendations {
  trending_score: number;
  instagram_spots: string[];
  youtube_vlogs: YouTubeVlog[];
  traveler_tips: string[];
  hashtags: string[];
}

export interface CardAction {
  type: 'navigate' | 'share' | 'bookmark' | 'view_details';
  label: string;
  payload: Record<string, any>;
}

export interface DestinationCard {
  id: string;
  title: string;
  subtitle: string;
  district: string;
  description: string;
  hero_image: string;
  gallery_images: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance_km: number;
  estimated_duration_minutes: number;
  categories: string[];
  interests: string[];
  badge?: string;
  web_recommendations: WebRecommendations;
  social_recommendations: SocialRecommendations;
  actions: CardAction[];
}

export interface NearbyCardsResponse {
  total: number;
  user_location: { latitude: number; longitude: number } | null;
  radius_km: number;
  cards: DestinationCard[];
}

export interface SearchCardsResponse {
  query: string;
  total: number;
  cards: DestinationCard[];
}

export interface GroundedChatResponse {
  text: string;
  search_snippets: WebSearchSnippet[];
  places: Array<{
    name: string;
    lat: number;
    lng: number;
    district: string;
  }>;
  matched_destination?: string | null;
  time_feasible: boolean;
  required_minutes?: number | null;
}

// ─── Translation & Voice API ──────────────────────────────────────────────────
/**
 * Bidirectional English ⟷ Manipuri Text Translation
 * Supports Meetei Mayek script output and optional voice synthesis
 */
export const translateText = async (
  text: string,
  sourceLanguage: 'en' | 'mni' = 'en',
  targetLanguage: 'en' | 'mni' = 'mni',
  generateVoice: boolean = false
): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${TRANSLATION_API_BASE_URL}/api/translate-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        text,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        generate_voice: generateVoice,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.translated_text || data.text || '',
      originalText: data.original_text || text,
      audioBase64: data.audio_base64 || '',
      provider: data.provider || 'AI4Bharat IndicTrans2',
      latencyMs: data.latency_ms,
    };
  } catch (error: any) {
    console.error('Text Translation Error:', error);
    return { error: error.message };
  }
};

/**
 * Text-to-Speech (TTS) Voice Synthesis
 */
export const synthesizeVoice = async (
  text: string,
  targetLanguage: 'en' | 'mni' = 'mni',
  voiceGender: 'female' | 'male' = 'female'
): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${TRANSLATION_API_BASE_URL}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        target_language: targetLanguage,
        voice_gender: voiceGender,
        return_binary: false,
      }),
    });

    if (!response.ok) throw new Error(`TTS API error: HTTP ${response.status}`);
    const data = await response.json();
    return {
      audioBase64: data.audio_base64 || '',
      provider: data.provider,
    };
  } catch (error: any) {
    console.error('TTS Error:', error);
    return { error: error.message };
  }
};

/**
 * Direct Base64 Speech-to-Speech via /api/sts-json
 */
export const speechToSpeechJson = async (
  audioBase64: string,
  sourceLanguage: 'en' | 'mni' = 'en',
  targetLanguage: 'en' | 'mni' = 'mni',
  voiceGender: 'female' | 'male' = 'female'
): Promise<ApiResponse> => {
  try {
    const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const response = await fetch(`${TRANSLATION_API_BASE_URL}/api/sts-json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        audio_base64: cleanBase64,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        voice_gender: voiceGender,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`STS API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return {
      text: data.translated_text || '',
      originalText: data.recognized_text || '',
      audioBase64: data.audio_base64 || '',
      sourceLanguage: data.source_language || sourceLanguage,
      targetLanguage: data.target_language || targetLanguage,
      provider: data.provider || 'AI4Bharat IndicStack',
      latencyMs: data.latency_ms,
    };
  } catch (error: any) {
    console.error('STS JSON Error:', error);
    return { error: error.message };
  }
};

/**
 * End-to-end Speech-to-Speech Translation
 * Accepts either local audio file URI or base64 audio string
 */
export const speechToSpeech = async (
  audioUriOrBase64: string,
  sourceLanguage: 'auto' | 'en' | 'mni' = 'auto',
  targetLanguage: 'auto' | 'en' | 'mni' = 'mni',
  voiceGender: 'female' | 'male' = 'female'
): Promise<ApiResponse> => {
  try {
    // If it is a base64 string directly
    if (audioUriOrBase64.startsWith('data:') || (!audioUriOrBase64.startsWith('file://') && !audioUriOrBase64.startsWith('content://') && audioUriOrBase64.length > 200)) {
      return await speechToSpeechJson(audioUriOrBase64, sourceLanguage as any, targetLanguage as any, voiceGender);
    }

    // Try reading file as base64 first
    try {
      const FileSystem = require('expo-file-system/legacy');
      const b64 = await FileSystem.readAsStringAsync(audioUriOrBase64, {
        encoding: FileSystem.EncodingType?.Base64 || 'base64',
      });
      if (b64) {
        return await speechToSpeechJson(b64, sourceLanguage as any, targetLanguage as any, voiceGender);
      }
    } catch {
      // Fallback to multipart FormData
    }

    const formData = new FormData();
    formData.append('file', {
      uri: audioUriOrBase64,
      type: 'audio/wav',
      name: 'recording.wav',
    } as any);
    formData.append('source_language', sourceLanguage);
    formData.append('target_language', targetLanguage);
    formData.append('voice_gender', voiceGender);

    const response = await fetch(`${TRANSLATION_API_BASE_URL}/api/sts`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      body: formData,
    });

    if (!response.ok) throw new Error(`STS API error: HTTP ${response.status}`);
    const data = await response.json();
    return {
      text: data.translated_text || '',
      originalText: data.recognized_text || '',
      audioBase64: data.audio_base64 || '',
      sourceLanguage: data.source_language || sourceLanguage,
      targetLanguage: data.target_language || targetLanguage,
      provider: data.provider,
      latencyMs: data.latency_ms,
    };
  } catch (error: any) {
    console.error('STS Error:', error);
    return { error: error.message };
  }
};

/**
 * Speech-to-Text Audio Transcription
 */
export const transcribeAudio = async (
  audioUri: string,
  sourceLanguage: 'en' | 'mni' = 'en'
): Promise<ApiResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/wav',
      name: 'recording.wav',
    } as any);
    formData.append('source_language', sourceLanguage);

    const response = await fetch(`${TRANSLATION_API_BASE_URL}/api/transcribe`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      body: formData,
    });

    if (!response.ok) throw new Error(`ASR API error: HTTP ${response.status}`);
    const data = await response.json();
    return {
      text: data.text || '',
      originalText: data.text || '',
      provider: data.provider,
    };
  } catch (error: any) {
    console.error('ASR Error:', error);
    return { error: error.message };
  }
};

// ─── Landmark Vision API ──────────────────────────────────────────────────────
export const recognizeLandmarkFile = async (
  fileData: { uri: string; name?: string; type?: string } | Blob
): Promise<LandmarkResponse> => {
  const formData = new FormData();
  if (fileData instanceof Blob) {
    formData.append('file', fileData, 'photo.jpg');
  } else {
    formData.append('file', {
      uri: fileData.uri,
      name: fileData.name || 'photo.jpg',
      type: fileData.type || 'image/jpeg',
    } as any);
  }

  const response = await fetch(`${API_BASE_URL}/api/vision/recognize`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Vision API Error (${response.status}): ${errText}`);
  }

  return await response.json();
};

export const recognizeLandmarkBase64 = async (
  imageBase64: string
): Promise<LandmarkResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/vision/recognize-base64`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64 }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Vision API Error (${response.status}): ${errText}`);
  }

  return await response.json();
};

// ─── Recommendation Cards API ─────────────────────────────────────────────────
export const fetchNearbyRecommendations = async (
  latitude: number,
  longitude: number,
  radiusKm = 25.0,
  limit = 5
): Promise<NearbyCardsResponse> => {
  const url = `${API_BASE_URL}/api/recommendations/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Recommendations API error (${response.status})`);
  }
  return await response.json();
};

export const searchRecommendations = async (
  query: string,
  latitude?: number,
  longitude?: number,
  limit = 5
): Promise<SearchCardsResponse> => {
  let url = `${API_BASE_URL}/api/recommendations/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  if (latitude !== undefined && longitude !== undefined) {
    url += `&latitude=${latitude}&longitude=${longitude}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Search recommendations error (${response.status})`);
  }
  return await response.json();
};

export const fetchDestinationCard = async (
  placeId: string,
  latitude?: number,
  longitude?: number
): Promise<DestinationCard> => {
  let url = `${API_BASE_URL}/api/recommendations/${encodeURIComponent(placeId)}/card`;
  if (latitude !== undefined && longitude !== undefined) {
    url += `?latitude=${latitude}&longitude=${longitude}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Destination card error (${response.status})`);
  }
  return await response.json();
};

/**
 * Health check to verify translation server is reachable
 */
export const checkTranslationEngineHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${TRANSLATION_API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Calls backend Search + AI Grounded Chat engine.
 * Combines Google/DuckDuckGo web search with verified geographic facts
 * to eliminate hallucinations on travel times and itineraries.
 */
export const askGroundedChat = async (
  message: string,
  latitude: number = 24.8170,
  longitude: number = 93.9368,
  availableMinutes?: number,
  history?: Array<{ role: string; content: string }>
): Promise<GroundedChatResponse> => {
  const url = `${API_BASE_URL}/api/chat/grounded`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      latitude,
      longitude,
      available_minutes: availableMinutes,
      history,
    }),
  });

  if (!response.ok) {
    throw new Error(`Grounded Chat API error (${response.status})`);
  }
  return await response.json();
};

