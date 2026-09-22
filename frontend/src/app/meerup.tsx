import React from 'react';
import { Image, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { Colors, MaxContentWidth } from '@/constants/theme';

export default function MeerupAIScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.logoCircle, { borderColor: colors.border }]}>
          <Image
            source={require('@/assets/images/meerup-emblem.jpg')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>MEERUP AI Companion</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your intelligent sanctuary guide: voice assistant, cultural etiquette RAG, and live itinerary concierge.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 2,
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 340,
  },
});
