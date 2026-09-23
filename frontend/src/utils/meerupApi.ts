import { Platform } from 'react-native';

// ─── Backend URL Configuration ────────────────────────────────────────────────
// Web / iOS simulator use localhost:8000; Android emulator uses 10.0.2.2:8000
const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location?.hostname
    ? `http://${window.location.hostname}:8000`
    : DEFAULT_HOST);

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface ApiResponse {
  text?: string;
  audioBase64?: string;
  error?: string;
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

// ─── Translation & Voice API ──────────────────────────────────────────────────
export const translateText = async (text: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/translate-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    return await response.json();
  } catch (error: any) {
    console.error('Text Translation Error:', error);
    return { error: error.message };
  }
};

export const speechToSpeech = async (audioUri: string): Promise<ApiResponse> => {
  try {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const response = await fetch(`${API_BASE_URL}/api/sts`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    return await response.json();
  } catch (error: any) {
    console.error('STS Error:', error);
    return { error: error.message };
  }
};

export const transcribeAudio = async (audioUri: string): Promise<ApiResponse> => {
  try {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    return await response.json();
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
