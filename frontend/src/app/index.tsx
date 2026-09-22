import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, MaxContentWidth } from '@/constants/theme';

export default function ExploreScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}>
      <View style={styles.mainWrapper}>
        {/* Sanctuary Companion Sub-header */}
        <View style={styles.greetingHeader}>
          <View style={styles.tagRow}>
            <Text style={[styles.companionTag, { color: colors.accent }]}>
              SANCTUARY COMPANION
            </Text>
            <View style={[styles.weatherBadge, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <Text style={[styles.weatherText, { color: colors.textSecondary }]}>
                24°C • Golden Hour
              </Text>
            </View>
          </View>

          <Text style={[styles.greetingTitle, { color: colors.text }]}>
            Good morning, Explorer
          </Text>
          <Text style={[styles.greetingSubtitle, { color: colors.textSecondary }]}>
            The valley mist is lifting over the sacred groves. Where shall we wander?
          </Text>
        </View>

        {/* Ask MEERUP AI Search Card */}
        <View style={[styles.searchCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.searchCardHeader}>
            <Text style={[styles.searchCardTitle, { color: colors.text }]}>Ask MEERUP</Text>
            <View style={[styles.sparkleBadge, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="sparkles" size={14} color={colors.accent} />
            </View>
          </View>

          <View style={[styles.inputBox, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <TextInput
              placeholder="Inquire about history, rituals, or places..."
              placeholderTextColor={colors.textSecondary}
              style={[styles.textInput, { color: colors.text }]}
              editable={false}
            />
            <TouchableOpacity style={styles.cameraIconBtn}>
              <Ionicons name="camera-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Filter Pill */}
        <View style={styles.quickPillsRow}>
          <View style={[styles.pill, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.pillText, { color: colors.textSecondary }]}>
              3-hour cultural tour
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.pillText, { color: colors.textSecondary }]}>
              Sacred Etiquette
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  mainWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: 20,
  },
  greetingHeader: {
    gap: 8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  companionTag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  weatherBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  weatherText: {
    fontSize: 11,
    fontWeight: '500',
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: '92%',
  },
  searchCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  searchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sparkleBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  cameraIconBtn: {
    padding: 2,
  },
  quickPillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
