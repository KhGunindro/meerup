import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useColorScheme,
  RefreshControl,
  Image,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { supabase, TripRecord, SavedPlaceRecord } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();

  const { user, profile, isLoading: isAuthLoading, signOut } = useAuth();

  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot_password'>('login');
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlaceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'saved_places' | 'trips'>('saved_places');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadUserData = async () => {
    try {
      setIsLoadingData(true);
      const currentUserId = user?.id || 'guest_user';
      const userKey = `@meerup_saved_trips_${currentUserId}`;
      const globalKey = `@meerup_saved_trips_all`;
      const guestKey = `@meerup_saved_trips_guest_user`;

      const placeUserKey = `@meerup_saved_places_${currentUserId}`;
      const placeGlobalKey = `@meerup_saved_places_all`;
      const placeGuestKey = `@meerup_saved_places_guest_user`;

      // 1. Fetch local cached trips
      let localTrips: TripRecord[] = [];
      try {
        const [rawUser, rawGlobal, rawGuest] = await Promise.all([
          AsyncStorage.getItem(userKey),
          AsyncStorage.getItem(globalKey),
          AsyncStorage.getItem(guestKey),
        ]);
        const pUser = rawUser ? JSON.parse(rawUser) : [];
        const pGlobal = rawGlobal ? JSON.parse(rawGlobal) : [];
        const pGuest = rawGuest ? JSON.parse(rawGuest) : [];
        
        const listUser: TripRecord[] = Array.isArray(pUser) ? pUser : [];
        const listGlobal: TripRecord[] = Array.isArray(pGlobal) ? pGlobal : [];
        const listGuest: TripRecord[] = Array.isArray(pGuest) ? pGuest : [];
        localTrips = [...listUser, ...listGlobal, ...listGuest];
      } catch (err) {
        console.log('Error reading local trips:', err);
      }

      // 2. Fetch local cached places
      let localPlaces: SavedPlaceRecord[] = [];
      try {
        const [rawPlaceUser, rawPlaceGlobal, rawPlaceGuest] = await Promise.all([
          AsyncStorage.getItem(placeUserKey),
          AsyncStorage.getItem(placeGlobalKey),
          AsyncStorage.getItem(placeGuestKey),
        ]);
        const pPlaceUser = rawPlaceUser ? JSON.parse(rawPlaceUser) : [];
        const pPlaceGlobal = rawPlaceGlobal ? JSON.parse(rawPlaceGlobal) : [];
        const pPlaceGuest = rawPlaceGuest ? JSON.parse(rawPlaceGuest) : [];

        const listPlaceUser: SavedPlaceRecord[] = Array.isArray(pPlaceUser) ? pPlaceUser : [];
        const listPlaceGlobal: SavedPlaceRecord[] = Array.isArray(pPlaceGlobal) ? pPlaceGlobal : [];
        const listPlaceGuest: SavedPlaceRecord[] = Array.isArray(pPlaceGuest) ? pPlaceGuest : [];
        localPlaces = [...listPlaceUser, ...listPlaceGlobal, ...listPlaceGuest];
      } catch (err) {
        console.log('Error reading local places:', err);
      }

      // 3. Fetch user trips and places from Supabase if logged in
      let cloudTrips: TripRecord[] = [];
      let cloudPlaces: SavedPlaceRecord[] = [];
      if (user) {
        try {
          const { data: tripsData, error } = await supabase
            .from('trips')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

          if (tripsData && !error) {
            cloudTrips = tripsData as TripRecord[];
          }
        } catch (cloudErr) {
          console.log('Supabase fetch trips notice:', cloudErr);
        }

        try {
          const { data: placesData, error: pErr } = await supabase
            .from('saved_places')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (placesData && !pErr) {
            cloudPlaces = placesData as SavedPlaceRecord[];
          }
        } catch (cloudErr) {
          console.log('Supabase fetch places notice:', cloudErr);
        }
      }

      // 4. Merge trips and deduplicate by destination_name
      const mergedTripsMap = new Map<string, TripRecord>();
      localTrips.forEach((t) => {
        if (t && t.destination_name) mergedTripsMap.set(t.destination_name, t);
      });
      cloudTrips.forEach((t) => {
        if (t && t.destination_name) mergedTripsMap.set(t.destination_name, t);
      });
      const finalTrips = Array.from(mergedTripsMap.values());
      setTrips(finalTrips);

      // 5. Merge saved places and deduplicate by place_name
      const mergedPlacesMap = new Map<string, SavedPlaceRecord>();
      localPlaces.forEach((p) => {
        if (p && p.place_name) mergedPlacesMap.set(p.place_name, p);
      });
      cloudPlaces.forEach((p) => {
        if (p && p.place_name) mergedPlacesMap.set(p.place_name, p);
      });

      // 6. Ensure any saved trip also appears as a saved place if not already present
      finalTrips.forEach((t) => {
        if (t && t.destination_name && !mergedPlacesMap.has(t.destination_name)) {
          mergedPlacesMap.set(t.destination_name, {
            id: `place_${t.id}`,
            user_id: t.user_id || currentUserId,
            place_name: t.destination_name,
            latitude: t.dest_lat,
            longitude: t.dest_lng,
            category: 'Destination',
            created_at: t.created_at,
          });
        }
      });

      const finalSavedPlaces = Array.from(mergedPlacesMap.values());
      setSavedPlaces(finalSavedPlaces);
    } catch (err) {
      console.log('Error loading user trips/places:', err);
    } finally {
      setIsLoadingData(false);
      setRefreshing(false);
    }
  };

  // Reload data whenever the Profile tab gains focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [user])
  );

  useEffect(() => {
    loadUserData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of MEERUP?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const handleNavigateToTrip = (trip: TripRecord) => {
    router.push({
      pathname: '/map',
      params: {
        destLat: trip.dest_lat.toString(),
        destLng: trip.dest_lng.toString(),
        destName: trip.destination_name,
      },
    });
  };

  const handleNavigateToPlace = (place: SavedPlaceRecord) => {
    router.push({
      pathname: '/map',
      params: {
        destLat: place.latitude.toString(),
        destLng: place.longitude.toString(),
        destName: place.place_name,
      },
    });
  };

  const handleDeletePlace = (place: SavedPlaceRecord) => {
    Alert.alert(
      'Remove Saved Place',
      `Remove "${place.place_name}" from your saved places?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const currentUserId = user?.id || 'guest_user';
            const placeUserKey = `@meerup_saved_places_${currentUserId}`;
            const placeGlobalKey = `@meerup_saved_places_all`;

            const updatedPlaces = savedPlaces.filter((p) => p.place_name !== place.place_name);
            setSavedPlaces(updatedPlaces);

            try {
              await AsyncStorage.setItem(placeUserKey, JSON.stringify(updatedPlaces));
              await AsyncStorage.setItem(placeGlobalKey, JSON.stringify(updatedPlaces));
              if (user) {
                await supabase.from('saved_places').delete().eq('user_id', user.id).eq('place_name', place.place_name);
              }
            } catch (e) {
              console.log('Error deleting place:', e);
            }
          },
        },
      ]
    );
  };

  const handleDeleteTrip = (trip: TripRecord) => {
    Alert.alert(
      'Remove Route',
      `Remove route to "${trip.destination_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const currentUserId = user?.id || 'guest_user';
            const userKey = `@meerup_saved_trips_${currentUserId}`;
            const globalKey = `@meerup_saved_trips_all`;

            const updatedTrips = trips.filter((t) => t.id !== trip.id && t.destination_name !== trip.destination_name);
            setTrips(updatedTrips);

            try {
              await AsyncStorage.setItem(userKey, JSON.stringify(updatedTrips));
              await AsyncStorage.setItem(globalKey, JSON.stringify(updatedTrips));
              if (user) {
                await supabase.from('trips').delete().eq('user_id', user.id).eq('id', trip.id);
              }
            } catch (e) {
              console.log('Error deleting trip:', e);
            }
          },
        },
      ]
    );
  };

  if (isAuthLoading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#4777c2" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        user ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4777c2" /> : undefined
      }
    >
      <View style={styles.contentWrapper}>
        {/* LOGGED OUT STATE */}
        {!user && (
          <View style={styles.loggedOutCard}>
            <View style={[styles.heroIconBg, { backgroundColor: isDark ? '#1F2937' : '#EFF6FF' }]}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.heroLogoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.loggedOutTitle, { color: colors.text }]}>Welcome to MEERUP</Text>
            <Text style={[styles.loggedOutSubtitle, { color: colors.textSecondary }]}>
              Sign in or create an account to save your routes, map navigation, track trips, and personalize your journey through Manipur.
            </Text>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.primaryAuthBtn}
                onPress={() => {
                  setAuthMode('login');
                  setAuthModalVisible(true);
                }}
              >
                <Text style={styles.primaryAuthBtnText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryAuthBtn, { borderColor: '#4777c2' }]}
                onPress={() => {
                  setAuthMode('signup');
                  setAuthModalVisible(true);
                }}
              >
                <Text style={styles.secondaryAuthBtnText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* LOGGED IN STATE */}
        {user && (
          <View style={styles.loggedInContainer}>
            {/* User Profile Card */}
            <View
              style={[
                styles.profileHeaderCard,
                { backgroundColor: isDark ? '#111827' : '#fff', borderColor: colors.border },
              ]}
            >
              <View style={styles.avatarRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {(
                      profile?.full_name?.trim() ||
                      user.user_metadata?.full_name?.trim() ||
                      user.email?.split('@')[0]?.trim() ||
                      'M'
                    ).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.userName, { color: colors.text }]}>
                      {profile?.full_name || 'Manipur Explorer'}
                    </Text>
                    <View style={styles.badgePill}>
                      <MaterialIcons name="verified" size={12} color="#047857" />
                      <Text style={styles.badgePillText}>Explorer</Text>
                    </View>
                  </View>
                  <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
                  <Text style={[styles.memberSince, { color: colors.textSecondary }]}>
                    Protected with Supabase Auth
                  </Text>
                </View>
              </View>

              {/* Quick Stats */}
              <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.statCol}
                  onPress={() => setActiveTab('saved_places')}
                >
                  <Text style={[styles.statValue, activeTab === 'saved_places' && { color: '#047857' }]}>
                    {savedPlaces.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Saved Places</Text>
                </TouchableOpacity>

                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  style={styles.statCol}
                  onPress={() => setActiveTab('trips')}
                >
                  <Text style={[styles.statValue, activeTab === 'trips' && { color: '#4777c2' }]}>
                    {trips.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Trips Taken</Text>
                </TouchableOpacity>

                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  style={styles.statCol}
                  onPress={() => router.push('/explore')}
                >
                  <Text style={styles.statValue}>14</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Destinations</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Segmented Tab Switcher */}
            <View style={[styles.tabSwitcher, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'saved_places' && styles.tabBtnActive,
                ]}
                onPress={() => setActiveTab('saved_places')}
              >
                <MaterialIcons
                  name="bookmark"
                  size={16}
                  color={activeTab === 'saved_places' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'saved_places'
                      ? styles.tabBtnTextActive
                      : { color: colors.textSecondary },
                  ]}
                >
                  Saved Places ({savedPlaces.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'trips' && styles.tabBtnActive,
                ]}
                onPress={() => setActiveTab('trips')}
              >
                <MaterialIcons
                  name="route"
                  size={16}
                  color={activeTab === 'trips' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'trips'
                      ? styles.tabBtnTextActive
                      : { color: colors.textSecondary },
                  ]}
                >
                  My Trips ({trips.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB CONTENT: SAVED PLACES */}
            {activeTab === 'saved_places' && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <MaterialIcons name="bookmark" size={20} color="#047857" />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Saved Destinations
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/map')}>
                    <Text style={styles.viewMapText}>Open Map</Text>
                  </TouchableOpacity>
                </View>

                {isLoadingData ? (
                  <ActivityIndicator size="small" color="#047857" style={{ marginVertical: 16 }} />
                ) : savedPlaces.length === 0 ? (
                  <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                    <MaterialIcons name="bookmark-border" size={36} color="#9CA3AF" />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved places yet</Text>
                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                      When you tap "Save" on the interactive map or bookmark places in Manipur, your saved spots will appear right here.
                    </Text>
                    <TouchableOpacity
                      style={[styles.exploreMapBtn, { backgroundColor: '#047857' }]}
                      onPress={() => router.push('/map')}
                    >
                      <Text style={styles.exploreMapBtnText}>Explore Places on Map</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.tripsList}>
                    {savedPlaces.map((place) => (
                      <View
                        key={place.id || place.place_name}
                        style={[
                          styles.placeCard,
                          { backgroundColor: isDark ? '#111827' : '#fff', borderColor: colors.border },
                        ]}
                      >
                        <View style={styles.placeCardLeft}>
                          <View style={styles.placeIconCircle}>
                            <MaterialIcons name="place" size={20} color="#047857" />
                          </View>
                          <View style={styles.placeDetails}>
                            <Text style={[styles.placeName, { color: colors.text }]} numberOfLines={1}>
                              {place.place_name}
                            </Text>
                            <View style={styles.placeBadgeRow}>
                              <View style={styles.categoryPill}>
                                <Text style={styles.categoryPillText}>
                                  {place.category || 'Destination'}
                                </Text>
                              </View>
                              <Text style={[styles.placeCoords, { color: colors.textSecondary }]}>
                                {place.latitude.toFixed(2)}°N, {place.longitude.toFixed(2)}°E
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.placeActionRow}>
                          <TouchableOpacity
                            style={[styles.navigatePlaceBtn, { backgroundColor: '#047857' }]}
                            onPress={() => handleNavigateToPlace(place)}
                          >
                            <MaterialIcons name="directions" size={16} color="#fff" />
                            <Text style={styles.navigatePlaceBtnText}>Directions</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.deleteIconBtn}
                            onPress={() => handleDeletePlace(place)}
                          >
                            <MaterialIcons name="delete-outline" size={18} color="#9CA3AF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* TAB CONTENT: MY TRIPS & ROUTES */}
            {activeTab === 'trips' && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <MaterialIcons name="route" size={20} color="#4777c2" />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      My Trips & Routes
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/map')}>
                    <Text style={styles.viewMapText}>Open Map</Text>
                  </TouchableOpacity>
                </View>

                {isLoadingData ? (
                  <ActivityIndicator size="small" color="#4777c2" style={{ marginVertical: 16 }} />
                ) : trips.length === 0 ? (
                  <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                    <MaterialIcons name="near-me-disabled" size={32} color="#9CA3AF" />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No routes saved yet</Text>
                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                      When you get directions or navigate to Kangla Fort, Loktak Lake, or Ima Keithel, your Swiggy-style trips will appear here.
                    </Text>
                    <TouchableOpacity
                      style={styles.exploreMapBtn}
                      onPress={() => router.push('/map')}
                    >
                      <Text style={styles.exploreMapBtnText}>Start Map Navigation</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.tripsList}>
                    {trips.map((trip) => (
                      <View
                        key={trip.id}
                        style={[
                          styles.tripCard,
                          { backgroundColor: isDark ? '#111827' : '#fff', borderColor: colors.border },
                        ]}
                      >
                        <View style={styles.tripCardHeader}>
                          <View style={styles.tripIconCircle}>
                            <MaterialIcons name="navigation" size={16} color="#4777c2" />
                          </View>
                          <View style={styles.tripInfo}>
                            <Text style={[styles.tripDestName, { color: colors.text }]}>
                              {trip.destination_name}
                            </Text>
                            <Text style={[styles.tripMeta, { color: colors.textSecondary }]}>
                              {trip.distance_km.toFixed(1)} km • ~{trip.estimated_duration_minutes} mins ETA
                            </Text>
                          </View>
                          <View style={styles.tripActionsRow}>
                            <TouchableOpacity
                              style={styles.reNavigateBtn}
                              onPress={() => handleNavigateToTrip(trip)}
                            >
                              <MaterialIcons name="directions" size={16} color="#fff" />
                              <Text style={styles.reNavigateText}>Route</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteIconBtn}
                              onPress={() => handleDeleteTrip(trip)}
                            >
                              <MaterialIcons name="delete-outline" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Quick Actions */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
                Account Settings
              </Text>
              <View
                style={[
                  styles.settingsList,
                  { backgroundColor: isDark ? '#111827' : '#fff', borderColor: colors.border },
                ]}
              >
                <TouchableOpacity
                  style={[styles.settingRow, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setAuthMode('forgot_password');
                    setAuthModalVisible(true);
                  }}
                >
                  <View style={styles.settingIconRow}>
                    <MaterialIcons name="lock-reset" size={20} color="#4777c2" />
                    <Text style={[styles.settingText, { color: colors.text }]}>Change Password</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={handleSignOut}
                >
                  <View style={styles.settingIconRow}>
                    <MaterialIcons name="logout" size={20} color="#EF4444" />
                    <Text style={[styles.settingText, { color: '#EF4444' }]}>Sign Out</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Auth Modal */}
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        initialMode={authMode}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentWrapper: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    padding: 16,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Logged out styles
  loggedOutCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  heroIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroLogoImage: {
    width: 62,
    height: 62,
  },
  loggedOutTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  loggedOutSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 340,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 320,
    marginBottom: 28,
  },
  primaryAuthBtn: {
    flex: 1,
    backgroundColor: '#4777c2',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4777c2',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  primaryAuthBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAuthBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryAuthBtnText: {
    color: '#4777c2',
    fontSize: 15,
    fontWeight: '700',
  },
  featuresBox: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureTexts: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Logged in styles
  loggedInContainer: {
    gap: 20,
  },
  profileHeaderCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4777c2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  userEmail: {
    fontSize: 13,
  },
  memberSince: {
    fontSize: 11,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 16,
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4777c2',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '80%',
  },

  // Sections
  sectionBlock: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  viewMapText: {
    fontSize: 13,
    color: '#4777c2',
    fontWeight: '600',
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
  },
  exploreMapBtn: {
    backgroundColor: '#4777c2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  exploreMapBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  tripsList: {
    gap: 10,
  },
  tripCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tripCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tripIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripInfo: {
    flex: 1,
    gap: 2,
  },
  tripDestName: {
    fontSize: 15,
    fontWeight: '700',
  },
  tripMeta: {
    fontSize: 12,
  },
  reNavigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4777c2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  reNavigateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tripActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Tab Switcher
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#4777c2',
    shadowColor: '#4777c2',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Place Cards
  placeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  placeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  placeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeDetails: {
    flex: 1,
    gap: 3,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  placeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  placeCoords: {
    fontSize: 11,
  },
  placeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  navigatePlaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  navigatePlaceBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteIconBtn: {
    padding: 6,
    borderRadius: 8,
  },

  // Settings
  settingsList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
