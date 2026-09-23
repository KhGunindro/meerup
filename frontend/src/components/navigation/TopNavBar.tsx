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

export function TopNavBar() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';

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
              source={require('@/assets/images/meerup-emblem.jpg')}
              style={styles.logoImage}
              resizeMode="cover"
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

          <Pressable
            onPress={handleAvatarPress}
            style={({ pressed }) => [
              styles.avatarPressable,
              pressed && styles.pressed,
            ]}
            accessibilityLabel="Open user profile"
            accessibilityRole="button">
            <View style={[styles.avatarRing, { borderColor: colors.border }]}>
              <Image
                source={require('@/assets/images/explorer-avatar.jpg')}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            </View>
          </Pressable>
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
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#05070B',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
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
    backgroundColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
});
