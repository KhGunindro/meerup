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
 * Launches live turn-by-turn GPS route navigation to target coordinates.
 * - Android: Uses 'google.navigation:q=lat,lng&mode=d' which launches Google Maps in active
 *   voice-guided turn-by-turn driving navigation with live GPS car icon ("Finding best route...").
 * - iOS: Uses 'maps://?daddr=lat,lng&dirflg=d' which starts turn-by-turn navigation in Apple Maps.
 * - Web/Fallback: Opens Google Maps Directions in a new tab.
 */
export function openTurnByTurnNavigation(
  lat: number,
  lng: number,
  label?: string
) {
  // Use explicit destination landmark query so Google Maps/Apple Maps locks onto the exact place (e.g. Ima Keithel vs Kangla Fort)
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

/**
 * Opens a location pin overview / search on Google Maps.
 */
export function openLocationPin(lat: number, lng: number) {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  Linking.openURL(url);
}

