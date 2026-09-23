import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';
import MapView, { Marker, Polyline, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';

// react-native-maps requires native code — it only works in a dev build or production build,
// NOT in Expo Go. Fall back to WebView/Leaflet when running inside Expo Go.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

import { Colors } from '@/constants/theme';
import { DESTINATIONS } from '@/constants/destinations';
import { getDestImg } from '@/constants/images';
import {
  getDistanceKm,
  calculateCarEtaMinutes,
  calculateBikeEtaMinutes,
  formatEtaString,
  launchExternalNavigationApp,
} from '@/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { AuthModal } from '@/components/auth/AuthModal';

interface MapDestination {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  image?: any;
  subtitle?: string;
}

const DEFAULT_ORIGIN = {
  lat: 24.8170, // Imphal center
  lng: 93.9368,
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();

  const { user } = useAuth();
  const [authModalVisible, setAuthModalVisible] = useState(false);

  // URL Query Parameters
  const params = useLocalSearchParams<{
    destLat?: string;
    destLng?: string;
    destName?: string;
    destCategory?: string;
    destImage?: string;
  }>();

  // User GPS Location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(DEFAULT_ORIGIN);
  const [isLocating, setIsLocating] = useState(true);

  // Selected Destination
  const [selectedDest, setSelectedDest] = useState<MapDestination>(() => {
    if (params.destLat && params.destLng && params.destName) {
      return {
        id: 'param-dest',
        name: params.destName,
        lat: parseFloat(params.destLat),
        lng: parseFloat(params.destLng),
        category: params.destCategory || 'Heritage',
        subtitle: 'Selected Destination',
      };
    }
    // Default to Kangla Fort
    const kangla = DESTINATIONS.find((d) => d.name.includes('Kangla')) || DESTINATIONS[0];
    return {
      id: kangla.id,
      name: kangla.name,
      lat: kangla.lat,
      lng: kangla.lng,
      category: kangla.category,
      subtitle: kangla.subtitle,
    };
  });

  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [tripSaved, setTripSaved] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const mapRef = useRef<MapView>(null);

  // Listen to incoming route params
  useEffect(() => {
    if (params.destLat && params.destLng && params.destName) {
      setSelectedDest({
        id: 'param-dest',
        name: params.destName,
        lat: parseFloat(params.destLat),
        lng: parseFloat(params.destLng),
        category: params.destCategory || 'Heritage',
        subtitle: 'Target Destination',
      });
      setTripSaved(false);
    }
  }, [params.destLat, params.destLng, params.destName]);

  // Request high-accuracy GPS location
  useEffect(() => {
    const fetchGps = async () => {
      try {
        setIsLocating(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          
          // Snap to Imphal if device is reporting a location far outside India (e.g. Europe mock)
          const distToImphal = getDistanceKm(lat, lng, DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lng);
          if (distToImphal > 1000) {
            setUserLocation(DEFAULT_ORIGIN);
            Alert.alert(
              'Location Mocked',
              `Your device is reporting coordinates outside Manipur (${lat.toFixed(4)}, ${lng.toFixed(4)} — ${Math.round(distToImphal)}km away). \n\nThis happens if you're indoors (Network/IP location fallback), using a VPN, or have a mock location set. \n\nWe have snapped you to Imphal for testing.`
            );
          } else {
            setUserLocation({ lat, lng });
          }
        }
      } catch (err) {
        console.warn('GPS location error:', err);
      } finally {
        setIsLocating(false);
      }
    };
    fetchGps();
  }, []);

  // Distance and ETA Calculations
  const distanceKm = useMemo(() => {
    return getDistanceKm(userLocation.lat, userLocation.lng, selectedDest.lat, selectedDest.lng);
  }, [userLocation, selectedDest]);

  const carEta = useMemo(() => {
    return calculateCarEtaMinutes(distanceKm);
  }, [distanceKm]);

  const bikeEta = useMemo(() => {
    return calculateBikeEtaMinutes(distanceKm);
  }, [distanceKm]);

  // Generate Swiggy-Style Leaflet HTML Map with Blue Polyline (#4777c2)
  const mapHtml = useMemo(() => {
    const uLat = userLocation.lat;
    const uLng = userLocation.lng;
    const dLat = selectedDest.lat;
    const dLng = selectedDest.lng;
    const dName = selectedDest.name.replace(/'/g, "\\'");
    const CARTO_KEY = process.env.EXPO_PUBLIC_CARTO_API_KEY ?? '';

    // Generate intermediate waypoint for realistic road-like curved path
    const midLat = (uLat + dLat) / 2 + (dLng - uLng) * 0.08;
    const midLng = (uLng + dLng) / 2 - (dLat - uLat) * 0.08;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: #f8fafc;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          /* Swiggy-style User Pulse Marker */
          .user-pulse-container {
            position: relative;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .user-pulse-ring {
            position: absolute;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: rgba(71, 119, 194, 0.4);
            animation: pulseRadar 1.8s infinite ease-out;
          }
          .user-pulse-dot {
            position: relative;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #4777c2;
            border: 3.5px solid #ffffff;
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
            z-index: 2;
          }
          @keyframes pulseRadar {
            0% { transform: scale(0.5); opacity: 0.9; }
            100% { transform: scale(2.2); opacity: 0; }
          }

          /* Swiggy-style Destination Pin */
          .dest-pin-box {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .dest-label-tag {
            background: #111827;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 12px;
            border: 2px solid #4777c2;
            white-space: nowrap;
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            margin-bottom: 2px;
          }
          .dest-pin-head {
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            background: #4777c2;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 12px rgba(71, 119, 194, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .dest-pin-icon {
            transform: rotate(45deg);
            color: #ffffff;
            font-size: 14px;
            font-weight: 900;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          });

          // Modern clean map tiles
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}', {
            maxZoom: 19
          }).addTo(map);

          var userCoords = [${uLat}, ${uLng}];
          var destCoords = [${dLat}, ${dLng}];
          var midCoords = [${midLat}, ${midLng}];

          // 1. Swiggy-Style User Marker
          var userIcon = L.divIcon({
            className: 'user-marker-icon',
            html: '<div class="user-pulse-container"><div class="user-pulse-ring"></div><div class="user-pulse-dot"></div></div>',
            iconSize: [48, 48],
            iconAnchor: [24, 24]
          });
          L.marker(userCoords, { icon: userIcon }).addTo(map);

          // 2. Swiggy-Style Destination Marker
          var destIcon = L.divIcon({
            className: 'dest-marker-icon',
            html: '<div class="dest-pin-box"><div class="dest-label-tag">${dName}</div><div class="dest-pin-head"><span class="dest-pin-icon">★</span></div></div>',
            iconSize: [120, 50],
            iconAnchor: [60, 48]
          });
          L.marker(destCoords, { icon: destIcon }).addTo(map);

          // 3. Swiggy-Style Route Polyline in Accent Blue (#4777c2)
          // Glow background polyline
          L.polyline([userCoords, midCoords, destCoords], {
            color: 'rgba(71, 119, 194, 0.25)',
            weight: 12,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          // Main sharp accent blue path
          L.polyline([userCoords, midCoords, destCoords], {
            color: '#4777c2',
            weight: 5.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: '1, 0'
          }).addTo(map);

          // Auto-fit bounds with padding
          var bounds = L.latLngBounds([userCoords, midCoords, destCoords]);
          map.fitBounds(bounds, {
            paddingTopLeft: [40, 60],
            paddingBottomRight: [40, 220],
            maxZoom: 16
          });
        </script>
      </body>
      </html>
    `;
  }, [userLocation, selectedDest]);

  // Native Route Coordinates
  const nativeRouteCoords = useMemo(() => {
    const uLat = userLocation.lat;
    const uLng = userLocation.lng;
    const dLat = selectedDest.lat;
    const dLng = selectedDest.lng;
    const midLat = (uLat + dLat) / 2 + (dLng - uLng) * 0.08;
    const midLng = (uLng + dLng) / 2 - (dLat - uLat) * 0.08;
    return [
      { latitude: uLat, longitude: uLng },
      { latitude: midLat, longitude: midLng },
      { latitude: dLat, longitude: dLng },
    ];
  }, [userLocation, selectedDest]);

  useEffect(() => {
    if (mapRef.current && nativeRouteCoords.length === 3) {
      mapRef.current.fitToCoordinates(nativeRouteCoords, {
        edgePadding: { top: 100, right: 80, bottom: 350, left: 80 },
        animated: true,
      });
    }
  }, [nativeRouteCoords]);

  // Save Route to Supabase Trips
  const handleSaveRoute = async () => {
    if (!user) {
      setAuthModalVisible(true);
      return;
    }

    try {
      setIsSavingTrip(true);
      const { error } = await supabase.from('trips').insert({
        user_id: user.id,
        destination_name: selectedDest.name,
        origin_lat: userLocation.lat,
        origin_lng: userLocation.lng,
        dest_lat: selectedDest.lat,
        dest_lng: selectedDest.lng,
        distance_km: parseFloat(distanceKm.toFixed(2)),
        estimated_duration_minutes: carEta,
        status: 'saved',
        route_summary: `Fastest route to ${selectedDest.name} (${distanceKm.toFixed(1)} km)`,
      });

      if (!error) {
        setTripSaved(true);
        Alert.alert('Route Saved!', `Your route to ${selectedDest.name} is saved to your profile.`);
      } else {
        Alert.alert('Save Failed', error.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save trip');
    } finally {
      setIsSavingTrip(false);
    }
  };

  // Launch External GPS (Google Maps / Apple Maps)
  const handleStartVoiceGps = () => {
    launchExternalNavigationApp(selectedDest.lat, selectedDest.lng, selectedDest.name);
  };

  // Share ETA with Friends
  const handleShareEta = async () => {
    try {
      const msg = `📍 Tracking route to ${selectedDest.name} in Manipur via MEERUP!\nEstimated Time to Reach: ${formatEtaString(carEta, distanceKm)}\nNavigating now.`;
      await Share.share({ message: msg });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── MAP CANVAS (SWIGGY STYLE) ── */}
      <View style={StyleSheet.absoluteFill}>
        {Platform.OS === 'web' ? (
          // ── WEB: iframe + Leaflet
          <iframe
            srcDoc={mapHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Swiggy-Style Manipur Map"
          />
        ) : IS_EXPO_GO ? (
          // ── EXPO GO: react-native-maps is unavailable; use WebView + Leaflet
          <WebView
            source={{ html: mapHtml }}
            style={styles.webView}
            scrollEnabled={false}
            allowsInlineMediaPlayback
            javaScriptEnabled
          />
        ) : (
          // ── DEV BUILD / PRODUCTION: native MapView with CARTO tile overlay
          <MapView
            ref={mapRef}
            style={styles.webView}
            provider={PROVIDER_DEFAULT}
            mapType="none"
            initialRegion={{
              latitude: userLocation.lat,
              longitude: userLocation.lng,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
          >
            <UrlTile
              urlTemplate={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${process.env.EXPO_PUBLIC_CARTO_API_KEY}`}
              maximumZ={19}
              flipY={false}
            />
            {/* Glow Polyline */}
            <Polyline
              coordinates={nativeRouteCoords}
              strokeColor="rgba(71, 119, 194, 0.25)"
              strokeWidth={12}
              lineCap="round"
              lineJoin="round"
            />
            {/* Main Polyline */}
            <Polyline
              coordinates={nativeRouteCoords}
              strokeColor="#4777c2"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
            {/* User Marker */}
            <Marker coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.userPulseContainer}>
                <View style={styles.userPulseRing} />
                <View style={styles.userPulseDot} />
              </View>
            </Marker>
            {/* Destination Marker */}
            <Marker coordinate={{ latitude: selectedDest.lat, longitude: selectedDest.lng }} anchor={{ x: 0.5, y: 1.0 }}>
              <View style={styles.destPinBox}>
                <Text style={styles.destLabelTag}>{selectedDest.name}</Text>
                <View style={styles.destPinHead}>
                  <Text style={styles.destPinIcon}>★</Text>
                </View>
              </View>
            </Marker>
          </MapView>
        )}
      </View>

      {/* ── TOP FLOATING CONTROLS ── */}
      <View style={[styles.topControls, { top: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.topBarRow}>
          <TouchableOpacity
            style={styles.backCircleBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={22} color="#1F2937" />
          </TouchableOpacity>

          {/* Quick Destination Pills Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.destCarousel}
          >
            {DESTINATIONS.map((dest) => {
              const isSelected = selectedDest.name === dest.name;
              return (
                <TouchableOpacity
                  key={dest.id}
                  style={[
                    styles.destChip,
                    isSelected && styles.destChipActive,
                  ]}
                  onPress={() => {
                    setSelectedDest({
                      id: dest.id,
                      name: dest.name,
                      lat: dest.lat,
                      lng: dest.lng,
                      category: dest.category,
                      subtitle: dest.subtitle,
                    });
                    setTripSaved(false);
                  }}
                >
                  <Text
                    style={[
                      styles.destChipText,
                      isSelected && styles.destChipTextActive,
                    ]}
                  >
                    {dest.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Recenter GPS Button */}
          <TouchableOpacity
            style={styles.recenterBtn}
            onPress={async () => {
              try {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                const lat = loc.coords.latitude;
                const lng = loc.coords.longitude;
                const distToImphal = getDistanceKm(lat, lng, DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lng);
                
                if (distToImphal > 1000) {
                  setUserLocation(DEFAULT_ORIGIN);
                  Alert.alert('Location Mocked', `Your device is reporting coordinates outside Manipur (${lat.toFixed(4)}, ${lng.toFixed(4)} — ${Math.round(distToImphal)}km away).\n\nSnapped to Imphal for testing.`);
                } else {
                  setUserLocation({ lat, lng });
                }
              } catch {}
            }}
            accessibilityLabel="Recenter GPS"
          >
            <MaterialIcons name="my-location" size={20} color="#4777c2" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SWIGGY-STYLE FLOATING BOTTOM SHEET ── */}
      <View
        style={[
          styles.bottomSheet,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 12,
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
          },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Live Status Row */}
        <View style={styles.statusRow}>
          <View style={styles.livePulseDot} />
          <Text style={styles.statusBadgeText}>LIVE GPS ROUTE</Text>
          {isLocating && (
            <ActivityIndicator size="small" color="#4777c2" style={{ marginLeft: 6 }} />
          )}
        </View>

        {/* Main ETA Header (Bold Blue) */}
        <View style={styles.etaRow}>
          <Ionicons name="car" size={28} color="#4777c2" />
          <Text style={styles.etaBoldText}>{carEta} MINS</Text>
          <Ionicons name="bicycle" size={30} color="#4777c2" style={{ marginLeft: 4 }} />
          <Text style={styles.etaBoldText}>{bikeEta} MINS</Text>
          <Text style={[styles.etaDotSeparator, { color: colors.textSecondary }]}>•</Text>
          <Text style={[styles.distanceBoldText, { color: colors.text }]}>
            {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
          </Text>
        </View>

        <Text style={[styles.routeSubtitle, { color: colors.textSecondary }]}>
          Fastest route to destination • Blue path highlighted on map
        </Text>

        {/* Destination Card Row */}
        <View
          style={[
            styles.destCardPreview,
            { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: colors.border },
          ]}
        >
          <Image
            source={getDestImg(selectedDest.id)}
            style={styles.destThumb}
            resizeMode="cover"
          />
          <View style={styles.destMetaCol}>
            <Text style={[styles.destCardTitle, { color: colors.text }]} numberOfLines={1}>
              {selectedDest.name}
            </Text>
            <Text style={[styles.destCardCategory, { color: colors.textSecondary }]} numberOfLines={1}>
              {selectedDest.category} • Manipur
            </Text>
          </View>
          <View style={styles.destTagPill}>
            <MaterialIcons name="navigation" size={12} color="#4777c2" />
            <Text style={styles.destTagText}>Target</Text>
          </View>
        </View>

        {/* Swiggy Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryNavigateBtn}
            onPress={handleStartVoiceGps}
          >
            <MaterialIcons name="directions" size={18} color="#FFFFFF" />
            <Text style={styles.primaryNavigateText}>Start Voice GPS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              tripSaved && styles.savedBtnActive,
              { borderColor: colors.border },
            ]}
            onPress={handleSaveRoute}
            disabled={isSavingTrip}
          >
            {isSavingTrip ? (
              <ActivityIndicator size="small" color="#4777c2" />
            ) : (
              <>
                <MaterialIcons
                  name={tripSaved ? 'bookmark' : 'bookmark-border'}
                  size={18}
                  color={tripSaved ? '#047857' : '#4777c2'}
                />
                <Text
                  style={[
                    styles.secondaryBtnText,
                    tripSaved && { color: '#047857' },
                  ]}
                >
                  {tripSaved ? 'Saved' : 'Save'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconActionBtn, { borderColor: colors.border }]}
            onPress={handleShareEta}
          >
            <MaterialIcons name="share" size={18} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Auth Modal (if user saves route while logged out) */}
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        initialMode="login"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topControls: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 20,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  destCarousel: {
    gap: 8,
    paddingRight: 6,
  },
  destChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  destChipActive: {
    backgroundColor: '#4777c2',
    borderColor: '#4777c2',
  },
  destChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1F2937',
  },
  destChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  recenterBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },

  // Swiggy-Style Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 12,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 30,
  },
  dragHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.8,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  etaBoldText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#4777c2', // Swiggy-style blue accent
    letterSpacing: 0.2,
  },
  etaDotSeparator: {
    fontSize: 20,
    fontWeight: '700',
  },
  distanceBoldText: {
    fontSize: 20,
    fontWeight: '700',
  },
  routeSubtitle: {
    fontSize: 12,
    marginBottom: 14,
  },
  destCardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  destThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  destMetaCol: {
    flex: 1,
    gap: 2,
  },
  destCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  destCardCategory: {
    fontSize: 12,
  },
  destTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  destTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4777c2',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryNavigateBtn: {
    flex: 2,
    backgroundColor: '#4777c2',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4777c2',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  primaryNavigateText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  savedBtnActive: {
    borderColor: '#047857',
    backgroundColor: '#ECFDF5',
  },
  secondaryBtnText: {
    color: '#4777c2',
    fontSize: 13,
    fontWeight: '700',
  },
  iconActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  // Native Swiggy-style Marker Styles
  userPulseContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPulseRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(71, 119, 194, 0.4)',
  },
  userPulseDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4777c2',
    borderWidth: 3.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  destPinBox: {
    alignItems: 'center',
  },
  destLabelTag: {
    backgroundColor: '#111827',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4777c2',
    overflow: 'hidden',
    marginBottom: 2,
  },
  destPinHead: {
    width: 32,
    height: 32,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: '#4777c2',
    borderWidth: 3,
    borderColor: '#ffffff',
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4777c2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  destPinIcon: {
    transform: [{ rotate: '45deg' }],
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
