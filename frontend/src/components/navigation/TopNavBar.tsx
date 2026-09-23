import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors, MaxContentWidth } from '@/constants/theme';

import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

export function TopNavBar() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';
  const { user, profile } = useAuth();

  const rawName =
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split('@')[0]?.trim() ||
    '';
  const firstChar = rawName ? rawName.charAt(0).toUpperCase() : (user ? 'E' : 'M');

  const topPadding = Platform.OS === 'web' ? 14 : Math.max(insets.top, 12) + 6;

  const handleAvatarPress = () => {
    router.push('/profile');
  };

  const handleTranslatePress = () => {
    router.push('/conversation');
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={[styles.container, { paddingTop: topPadding }]}>
        {/* Left: Brand Identity */}
        <View style={styles.brandRow}>
          <View style={[styles.logoBadge, { borderColor: colors.border }]}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.titleColumn}>
            <Text style={[styles.brandTitle, { color: colors.text }]}>MEERUP</Text>
            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
              Imphal, Manipur
            </Text>
          </View>
        </View>

        {/* Right Actions: Translate Button + Explorer Profile Avatar */}
        <View style={styles.rightActions}>
          <Pressable
            onPress={handleTranslatePress}
            style={({ pressed }) => [
              styles.translateBtn,
              {
                backgroundColor: isDark ? '#064E3B30' : '#ECFDF5',
                borderColor: isDark ? '#05966960' : '#A7F3D0',
              },
              pressed && styles.pressed,
            ]}
            accessibilityLabel="Open Speech-to-Speech Translator"
            accessibilityRole="button">
            <Ionicons name="language" size={15} color={colors.primary} />
            <Text style={[styles.translateBtnText, { color: colors.primary }]}>Translate</Text>
          </Pressable>

          {user ? (
            <Pressable
              onPress={handleAvatarPress}
              style={({ pressed }) => [
                styles.avatarPressable,
                pressed && styles.pressed,
              ]}
              accessibilityLabel="Open user profile"
              accessibilityRole="button">
              <View
                style={[
                  styles.avatarRing,
                  {
                    backgroundColor: '#047857',
                    borderColor: isDark ? '#05966980' : '#A7F3D0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.avatarInitial,
                    { color: '#FFFFFF' },
                  ]}
                >
                  {firstChar}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleAvatarPress}
              style={({ pressed }) => [
                styles.loginBtnNav,
                { backgroundColor: colors.primary },
                pressed && styles.pressed,
              ]}
              accessibilityLabel="Login or Sign up"
              accessibilityRole="button">
              <Text style={styles.loginBtnNavText}>Login</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderBottomWidth: 1,
    zIndex: 50,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 2,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleColumn: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  brandSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: 0.1,
    marginTop: 1,
  },
  avatarPressable: {
    padding: 2,
  },
  avatarRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  translateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  translateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  loginBtnNav: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  loginBtnNavText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
