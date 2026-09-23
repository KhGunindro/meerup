import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SavedPlaceRecord } from './supabase';
import { Alert } from 'react-native';

export const isPlaceSaved = async (userId: string | null, placeName: string): Promise<boolean> => {
  const currentUserId = userId || 'guest_user';
  const placeUserKey = `@meerup_saved_places_${currentUserId}`;
  const placeGlobalKey = `@meerup_saved_places_all`;
  
  try {
    const [rawUser, rawGlobal] = await Promise.all([
      AsyncStorage.getItem(placeUserKey),
      AsyncStorage.getItem(placeGlobalKey),
    ]);
    
    const pUser = rawUser ? JSON.parse(rawUser) : [];
    const pGlobal = rawGlobal ? JSON.parse(rawGlobal) : [];
    
    const listUser: SavedPlaceRecord[] = Array.isArray(pUser) ? pUser : [];
    const listGlobal: SavedPlaceRecord[] = Array.isArray(pGlobal) ? pGlobal : [];
    
    return [...listUser, ...listGlobal].some((p) => p.place_name === placeName);
  } catch {
    return false;
  }
};

export const toggleSavePlace = async (
  userId: string | null,
  dest: { id: string; name: string; lat: number; lng: number; category: string }
): Promise<boolean> => {
  const currentUserId = userId || 'guest_user';
  const placeUserKey = `@meerup_saved_places_${currentUserId}`;
  const placeGlobalKey = `@meerup_saved_places_all`;

  try {
    const [rawUser, rawGlobal] = await Promise.all([
      AsyncStorage.getItem(placeUserKey),
      AsyncStorage.getItem(placeGlobalKey),
    ]);
    
    const pUser = rawUser ? JSON.parse(rawUser) : [];
    const pGlobal = rawGlobal ? JSON.parse(rawGlobal) : [];
    
    let existingPlacesUser: SavedPlaceRecord[] = Array.isArray(pUser) ? pUser : [];
    let existingPlacesGlobal: SavedPlaceRecord[] = Array.isArray(pGlobal) ? pGlobal : [];
    
    const isSaved = existingPlacesUser.some((p) => p.place_name === dest.name);

    if (isSaved) {
      // Remove
      existingPlacesUser = existingPlacesUser.filter((p) => p.place_name !== dest.name);
      existingPlacesGlobal = existingPlacesGlobal.filter((p) => p.place_name !== dest.name);
      
      await AsyncStorage.setItem(placeUserKey, JSON.stringify(existingPlacesUser));
      await AsyncStorage.setItem(placeGlobalKey, JSON.stringify(existingPlacesGlobal));
      
      if (userId) {
        supabase.from('saved_places').delete().eq('user_id', userId).eq('place_name', dest.name).then();
      }
      return false; // Not saved anymore
    } else {
      // Add
      const newPlace: SavedPlaceRecord = {
        id: `place_${dest.id || Date.now()}`,
        user_id: currentUserId,
        place_name: dest.name,
        latitude: dest.lat,
        longitude: dest.lng,
        category: dest.category || 'Destination',
        created_at: new Date().toISOString(),
      };
      
      const updatedUser = [newPlace, ...existingPlacesUser].slice(0, 30);
      const updatedGlobal = [newPlace, ...existingPlacesGlobal].slice(0, 30);
      
      await AsyncStorage.setItem(placeUserKey, JSON.stringify(updatedUser));
      await AsyncStorage.setItem(placeGlobalKey, JSON.stringify(updatedGlobal));
      
      if (userId) {
        supabase.from('saved_places').insert({
          user_id: userId,
          place_name: dest.name,
          latitude: dest.lat,
          longitude: dest.lng,
          category: dest.category || 'Destination',
        }).then();
      }
      return true; // Saved successfully
    }
  } catch (e: any) {
    console.warn('Error toggling save place', e);
    return false;
  }
};
