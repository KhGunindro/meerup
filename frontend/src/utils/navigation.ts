import { Linking, Platform } from 'react-native';

/**
 * Launches turn-by-turn GPS route navigation from user's current location to target coordinates.
 * - iOS: Opens Apple Maps / Google Maps in direction mode (dirflg=d)
 * - Android: Launches Google Maps Navigation intent (google.navigation:q=lat,lng)
 * - Web/Fallback: Opens Google Maps Directions in a new tab
 */
export function openTurnByTurnNavigation(lat: number, lng: number, label?: string) {
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const nativeUrl = Platform.select({
    ios: `maps://?daddr=${lat},${lng}&dirflg=d`,
    android: `google.navigation:q=${lat},${lng}&mode=d`,
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
