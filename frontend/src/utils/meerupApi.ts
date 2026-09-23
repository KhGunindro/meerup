import { Platform } from 'react-native';

// In Android emulator, 10.0.2.2 maps to the host machine's localhost (127.0.0.1)
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const TRANSLATION_API_BASE_URL = `http://${HOST}:8000`;
export const BACKEND_API_BASE_URL = `http://${HOST}:8001`;

// Keep legacy export for backward compatibility
export const API_BASE_URL = TRANSLATION_API_BASE_URL;

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
        'Content-Type': 'multipart/form-data',
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
        'Content-Type': 'multipart/form-data',
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

/**
 * Health check to verify translation server is reachable
 */
export const checkTranslationEngineHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${TRANSLATION_API_BASE_URL}/api/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
};
