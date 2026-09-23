import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { getDistanceKm } from '@/utils/navigation';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async (requestIfDenied = false) => {
    try {
      setLoading(true);
      let { status } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted' && requestIfDenied) {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }

      if (status === 'granted') {
        setHasPermission(true);
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords: UserLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setLocation(coords);

        try {
          const geo = await Location.reverseGeocodeAsync(coords);
          if (geo[0]) {
            const place = geo[0].district || geo[0].city || geo[0].subregion || 'Current location';
            setLocationLabel(`${place}, Manipur`);
          }
        } catch {
          setLocationLabel('Current Location');
        }
      } else {
        setHasPermission(false);
        setError('Location permission not granted');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not fetch location');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Automatically query GPS location on mount
    fetchLocation(false).then(async () => {
      // If permission is not yet granted, request once so real location is available
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        fetchLocation(true);
      }
    });
  }, [fetchLocation]);

  const getFormattedDistance = useCallback(
    (destLat: number, destLng: number, fallback?: string): string => {
      if (!location) return fallback ?? '';
      const km = getDistanceKm(location.latitude, location.longitude, destLat, destLng);
      return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)} km`;
    },
    [location]
  );

  return {
    location,
    locationLabel,
    loading,
    hasPermission,
    error,
    requestLocation: () => fetchLocation(true),
    getFormattedDistance,
  };
}
