import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://havukdklsowjoghhtepj.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdnVrZGtsc293am9naGh0ZXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNzA2OTQsImV4cCI6MjEwNTY0NjY5NH0.Zkt2vPGydyJskKbj7W2VS8i3fTSP15G9gSc1ks27nRQ';

// Custom storage adapter ensuring compatibility across web and native platforms
const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {
      // silently ignore storage write errors
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {
      // silently ignore storage remove errors
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database Models
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  preferences?: {
    interests?: string[];
    language?: string;
  };
  created_at?: string;
}

export interface TripRecord {
  id: string;
  user_id?: string | null;
  destination_id?: string | null;
  destination_name: string;
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  distance_km: number;
  estimated_duration_minutes: number;
  status: 'active' | 'completed' | 'saved' | 'cancelled';
  route_summary?: string;
  created_at?: string;
}

export interface SavedPlaceRecord {
  id: string;
  user_id: string;
  place_name: string;
  latitude: number;
  longitude: number;
  category?: string;
  image_url?: string;
  notes?: string;
  created_at?: string;
}
