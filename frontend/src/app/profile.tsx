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
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { supabase, TripRecord, SavedPlaceRecord } from '@/utils/supabase';

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
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadUserData = async () => {
    if (!user) return;
    try {
      setIsLoadingData(true);
      // Fetch user trips
      const { data: tripsData } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (tripsData) {
        setTrips(tripsData as TripRecord[]);
      }

      // Fetch saved places
      const { data: placesData } = await supabase
        .from('saved_places')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (placesData) {
        setSavedPlaces(placesData as SavedPlaceRecord[]);
      }
    } catch (err) {
      console.warn('Error loading user trips/places:', err);
    } finally {
      setIsLoadingData(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      setTrips([]);
      setSavedPlaces([]);
    }
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
              <MaterialIcons name="travel-explore" size={48} color="#4777c2" />
            </View>
            <Text style={[styles.loggedOutTitle, { color: colors.text }]}>Welcome to MEERUP</Text>
            <Text style={[styles.loggedOutSubtitle, { color: colors.textSecondary }]}>
              Sign in or create an account to save your routes in Swiggy-style map navigation, track trips, and personalize your journey through Manipur.
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

            {/* Feature highlights */}
            <View style={[styles.featuresBox, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor: colors.border }]}>
              <View style={styles.featureItem}>
                <MaterialIcons name="map" size={20} color="#4777c2" />
                <View style={styles.featureTexts}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>Live Swiggy-Style Map</Text>
                  <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Real-time routing with ETA and landmark pins</Text>
                </View>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="cloud-sync" size={20} color="#047857" />
                <View style={styles.featureTexts}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>Supabase Cloud Sync</Text>
                  <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Your saved destinations & trip history backed up securely</Text>
                </View>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="photo-camera" size={20} color="#D97706" />
                <View style={styles.featureTexts}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>AI Landmark Vision</Text>
                  <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Instant camera identification of Kangla and Ima Keithel</Text>
                </View>
              </View>
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
                    {profile?.full_name
                      ? profile.full_name.charAt(0).toUpperCase()
                      : user.email?.charAt(0).toUpperCase() || 'M'}
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
                <View style={styles.statCol}>
                  <Text style={styles.statValue}>{trips.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Trips Taken</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statCol}>
                  <Text style={styles.statValue}>{savedPlaces.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Saved Places</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statCol}>
                  <Text style={styles.statValue}>14</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Destinations</Text>
                </View>
              </View>
            </View>

            {/* Recent Trips Section */}
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
                        <TouchableOpacity
                          style={styles.reNavigateBtn}
                          onPress={() => handleNavigateToTrip(trip)}
                        >
                          <MaterialIcons name="directions" size={16} color="#fff" />
                          <Text style={styles.reNavigateText}>Route</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

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
