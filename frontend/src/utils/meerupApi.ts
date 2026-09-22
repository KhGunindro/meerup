export const API_BASE_URL = 'http://192.168.1.100:3000'; // TODO: Update to actual backend URL

export interface ApiResponse {
  text?: string;
  audioBase64?: string; // base64 encoded audio
  error?: string;
}

export const translateText = async (text: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/translate-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) throw new Error('API Error');
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
      type: 'audio/m4a', // adjust based on expo-av recording format
      name: 'recording.m4a',
    } as any);

    const response = await fetch(`${API_BASE_URL}/api/sts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    
    if (!response.ok) throw new Error('API Error');
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
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    
    if (!response.ok) throw new Error('API Error');
    return await response.json();
  } catch (error: any) {
    console.error('ASR Error:', error);
    return { error: error.message };
  }
};
