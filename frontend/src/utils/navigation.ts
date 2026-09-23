import { Linking, Platform } from 'react-native';

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculates straight-line distance in km between two coordinate points (Haversine formula).
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates realistic estimated travel time (in minutes) for a 4-wheeler (Car).
 */
export function calculateCarEtaMinutes(distanceKm: number): number {
  if (distanceKm <= 0.1) return 1;
  const avgSpeedKmh = distanceKm > 15 ? 35 : 25;
  const driveMinutes = Math.round((distanceKm / avgSpeedKmh) * 60) + 3;
  return Math.max(3, driveMinutes);
}

/**
 * Calculates realistic estimated travel time (in minutes) for a 2-wheeler (Bike).
 * Bikes are typically faster in city traffic.
 */
export function calculateBikeEtaMinutes(distanceKm: number): number {
  if (distanceKm <= 0.1) return 1;
  const avgSpeedKmh = distanceKm > 15 ? 45 : 35;
  const driveMinutes = Math.round((distanceKm / avgSpeedKmh) * 60) + 2;
  return Math.max(2, driveMinutes);
}

/**
 * Formats ETA and distance nicely for Swiggy-style status badge.
 */
export function formatEtaString(minutes: number, distanceKm: number): string {
  const distStr = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
  if (minutes < 60) {
    return `${minutes} mins • ${distStr}`;
  }
  const hrs = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  return `${hrs} hr ${remMins > 0 ? `${remMins} min` : ''} • ${distStr}`;
}

/**
 * Launches external live turn-by-turn GPS route navigation (Google Maps / Apple Maps).
 */
export function launchExternalNavigationApp(
  lat: number,
  lng: number,
  label?: string
) {
  const destQuery = label ? encodeURIComponent(`${label}, Manipur`) : `${lat},${lng}`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destQuery}`;

  const nativeUrl = Platform.select({
    ios: `maps://?daddr=${destQuery}&dirflg=d`,
    android: `google.navigation:q=${destQuery}&mode=d`,
    default: webUrl,
  });

  if (Platform.OS === 'web') {
    Linking.openURL(webUrl);
    return;
  }

  Linking.canOpenURL(nativeUrl)
    .then((supported) => {
      if (supported) {
        Linking.openURL(nativeUrl);
      } else {
        Linking.openURL(webUrl);
      }
    })
    .catch(() => {
      Linking.openURL(webUrl);
    });
}

// Backwards-compatible alias for existing callers
export const openTurnByTurnNavigation = launchExternalNavigationApp;

/**
 * Opens a location pin overview / search on Google Maps.
 */
export function openLocationPin(lat: number, lng: number) {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  Linking.openURL(url);
}
