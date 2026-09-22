import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { getDestImg } from '@/constants/images';
import { findDestination } from '@/constants/destinations';
import { openTurnByTurnNavigation, openLocationPin } from '@/utils/navigation';
import { AudioGuidePlayer } from '@/components/destination/AudioGuidePlayer';
import { ArExperienceCard } from '@/components/destination/ArExperienceCard';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = 260;

type Tab = 'why' | 'highlights' | 'etiquette' | 'practical';

export default function DestinationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';

  const [tab, setTab] = useState<Tab>('why');
  const [bookmarked, setBookmarked] = useState(false);

  const dest = findDestination(id ?? '');

  if (!dest) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>Destination not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const openNavigation = () => {
    openTurnByTurnNavigation(dest.lat, dest.lng, dest.name);
  };

  const openMaps = () => {
    openLocationPin(dest.lat, dest.lng);
  };

  const cardBg = isDark ? colors.backgroundElement : '#FFFFFF';
  const sectionBg = isDark ? '#1C1D24' : '#F4F5F7';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── FLOATING TOP BAR ─────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.topBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.92)' }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topRight}>
          <TouchableOpacity
            onPress={() => setBookmarked((b) => !b)}
            style={[styles.topBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.92)' }]}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={bookmarked ? colors.accent : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.92)' }]}>
            <Ionicons name="share-social-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* ── HERO IMAGE ───────────────────────────── */}
        <View style={styles.heroWrap}>
          <Image source={getDestImg(dest.id)} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroGradient} />
        </View>

        {/* ── TITLE BLOCK ──────────────────────────── */}
        <View style={[styles.titleBlock, { backgroundColor: colors.background }]}>
          <View style={[styles.categoryBadge, { backgroundColor: dest.badgeColor }]}>
            <Text style={styles.categoryBadgeText}>{dest.badge}</Text>
          </View>
          <Text style={[styles.destName, { color: colors.text }]}>{dest.name}</Text>
          <View style={styles.subtitleRow}>
            <Ionicons name="location" size={13} color={colors.primary} />
            <Text style={[styles.destSubtitle, { color: colors.textSecondary }]}>{dest.subtitle}</Text>
          </View>

          {/* Quick stats */}
          <View style={[styles.statsRow, { borderColor: colors.border, backgroundColor: isDark ? '#16171E' : '#FAFAFA' }]}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={[styles.statValue, { color: colors.text }]}>{dest.rating}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rating</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={14} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{dest.dist}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Distance</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{dest.time}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Visit Time</Text>
            </View>
          </View>
        </View>

        {/* ── AUDIO GUIDE COMPANION ────────────────── */}
        {dest.audioGuide && (
          <AudioGuidePlayer
            guide={dest.audioGuide}
            colors={colors}
            isDark={isDark}
          />
        )}

        {/* ── EXPERIENCE IN AR ─────────────────────── */}
        {dest.arExperience && (
          <ArExperienceCard
            ar={dest.arExperience}
            destId={dest.id}
            colors={colors}
            isDark={isDark}
          />
        )}

        {/* ── TAB PILLS ────────────────────────────── */}
        <View style={[styles.tabRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {[
              { id: 'why', label: 'Why Visit' },
              { id: 'highlights', label: 'Highlights' },
              { id: 'etiquette', label: 'Etiquette' },
              { id: 'practical', label: 'Practical Info' },
            ].map((t) => {
              const isActive = tab === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setTab(t.id as Tab)}
                  style={[
                    styles.tabPill,
                    isActive
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: sectionBg, borderColor: colors.border },
                  ]}>
                  <Text style={[styles.tabPillText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── TAB CONTENT ──────────────────────────── */}
        <View style={[styles.tabContent, { backgroundColor: colors.background }]}>
          {tab === 'why' && (
            <View style={styles.cardContainer}>
              <Text style={[styles.contentHeading, { color: colors.text }]}>The Ancient Heritage</Text>
              <Text style={[styles.contentBody, { color: colors.textSecondary }]}>
                {dest.whyVisit}
              </Text>
            </View>
          )}

          {tab === 'highlights' && (
            <View style={styles.highlightsContainer}>
              <Text style={[styles.contentHeading, { color: colors.text, marginBottom: 8 }]}>
                Must-See Key Landmarks
              </Text>
              {(dest.highlights || []).map((item, idx) => (
                <View
                  key={idx}
                  style={[styles.highlightCard, { backgroundColor: isDark ? '#1C1D24' : '#F9FAFB', borderColor: colors.border }]}>
                  <View style={[styles.highlightNumber, { backgroundColor: isDark ? 'rgba(15,118,110,0.2)' : '#E6F4F1' }]}>
                    <Text style={[styles.highlightNumberText, { color: colors.primary }]}>{idx + 1}</Text>
                  </View>
                  <View style={styles.highlightTextCol}>
                    <Text style={[styles.highlightTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.highlightDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {tab === 'etiquette' && (
            <View style={styles.cardContainer}>
              <View style={styles.etiquetteHeader}>
                <View style={[styles.etiquetteIconWrap, { backgroundColor: isDark ? '#2A1F0A' : '#FEF3C7' }]}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
                </View>
                <Text style={[styles.contentHeading, { color: colors.text }]}>Sacred Etiquette & Respect</Text>
              </View>
              {dest.etiquette.split('. ').filter(Boolean).map((rule, i) => (
                <View key={i} style={styles.etiquetteItem}>
                  <View style={[styles.etiquetteDot, { backgroundColor: colors.accent }]} />
                  <Text style={[styles.etiquetteRule, { color: colors.textSecondary }]}>
                    {rule.endsWith('.') ? rule : rule + '.'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {tab === 'practical' && (
            <View style={styles.practicalGrid}>
              <Text style={[styles.contentHeading, { color: colors.text, marginBottom: 4, width: '100%' }]}>
                Visitor Practical Guide
              </Text>
              {dest.practicalInfo && (
                <>
                  <View style={[styles.practicalCard, { backgroundColor: isDark ? '#1C1D24' : '#F9FAFB', borderColor: colors.border }]}>
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                    <Text style={[styles.practicalLabel, { color: colors.textSecondary }]}>Visiting Hours</Text>
                    <Text style={[styles.practicalValue, { color: colors.text }]}>{dest.practicalInfo.timings}</Text>
                  </View>

                  <View style={[styles.practicalCard, { backgroundColor: isDark ? '#1C1D24' : '#F9FAFB', borderColor: colors.border }]}>
                    <Ionicons name="ticket-outline" size={20} color={colors.accent} />
                    <Text style={[styles.practicalLabel, { color: colors.textSecondary }]}>Entry Fees</Text>
                    <Text style={[styles.practicalValue, { color: colors.text }]}>{dest.practicalInfo.entryFee}</Text>
                  </View>

                  <View style={[styles.practicalCard, { backgroundColor: isDark ? '#1C1D24' : '#F9FAFB', borderColor: colors.border }]}>
                    <Ionicons name="hourglass-outline" size={20} color="#059669" />
                    <Text style={[styles.practicalLabel, { color: colors.textSecondary }]}>Ideal Duration</Text>
                    <Text style={[styles.practicalValue, { color: colors.text }]}>{dest.practicalInfo.idealDuration}</Text>
                  </View>

                  <View style={[styles.practicalCard, { backgroundColor: isDark ? '#1C1D24' : '#F9FAFB', borderColor: colors.border }]}>
                    <Ionicons name="camera-outline" size={20} color="#6366F1" />
                    <Text style={[styles.practicalLabel, { color: colors.textSecondary }]}>Photography</Text>
                    <Text style={[styles.practicalValue, { color: colors.text }]}>{dest.practicalInfo.photography}</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* ── ASK MEERUP PROMPTS SECTION ───────────── */}
        {dest.aiPrompts && dest.aiPrompts.length > 0 && (
          <View style={[styles.askSection, { backgroundColor: isDark ? '#181920' : '#F8F9FB', borderColor: colors.border }]}>
            <View style={styles.askSectionHeader}>
              <View style={[styles.aiSparkleBadge, { backgroundColor: isDark ? '#272832' : '#FFFFFF' }]}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.askSectionTitle, { color: colors.text }]}>Ask MEERUP About This Place</Text>
            </View>
            <View style={styles.promptsCol}>
              {dest.aiPrompts.map((prompt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.promptChip, { backgroundColor: isDark ? '#22232B' : '#FFFFFF', borderColor: colors.border }]}
                  onPress={() => router.push('/meerup' as any)}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} />
                  <Text style={[styles.promptChipText, { color: colors.text }]} numberOfLines={1}>
                    "{prompt}"
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── MAP & NAVIGATION CARD ─────────────────── */}
        <View style={[styles.mapCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/map' as any)}
            style={[styles.mapPlaceholder, { backgroundColor: isDark ? '#12181F' : '#E8F4F8' }]}>
            <View style={[styles.mapGrid, { borderColor: isDark ? '#1E2B35' : '#C8DDE8' }]} />
            <View style={[styles.mapGridH, { borderColor: isDark ? '#1E2B35' : '#C8DDE8' }]} />
            <View style={[styles.mapPin, { backgroundColor: dest.badgeColor }]}>
              <Ionicons name="location" size={15} color="#FFF" />
            </View>
            <Text style={[styles.mapPlaceholderLabel, { color: colors.text }]}>
              {dest.name} · {dest.lat.toFixed(4)}° N, {dest.lng.toFixed(4)}° E
            </Text>
            <View style={[styles.viewOnMapPill, { backgroundColor: colors.primary }]}>
              <Text style={styles.viewOnMapText}>View on Interactive Map</Text>
              <Ionicons name="map" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Map action buttons */}
          <View style={[styles.mapActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.mapBtn, { borderRightColor: colors.border }]}
              onPress={() => router.push('/map' as any)}>
              <Ionicons name="map-outline" size={15} color={colors.primary} />
              <Text style={[styles.mapBtnText, { color: colors.primary }]}>Interactive Map</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapBtn} onPress={openNavigation}>
              <Ionicons name="navigate" size={15} color={colors.primary} />
              <Text style={[styles.mapBtnText, { color: colors.primary }]}>Start Navigation</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacing to clear sticky bar */}
        <View style={{ height: insets.bottom + 90 }} />
      </ScrollView>

      {/* ── STICKY BOTTOM ACTION BAR ────────────────── */}
      <View
        style={[
          styles.stickyBottom,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}>
        <View style={styles.stickyActionsRow}>
          <TouchableOpacity
            style={[styles.askCompanionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/meerup' as any)}>
            <Ionicons name="sparkles" size={16} color="#FFF" />
            <Text style={styles.askCompanionText}>Ask MEERUP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.arQuickBtn, { borderColor: colors.border, backgroundColor: isDark ? '#232530' : '#F3F4F6' }]}
            onPress={openNavigation}>
            <Ionicons name="navigate-outline" size={16} color={colors.text} />
            <Text style={[styles.arQuickText, { color: colors.text }]}>Directions</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Top bar overlay
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  topRight: { flexDirection: 'row', gap: 8 },
  topBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 4,
  },

  // Hero
  heroWrap: { width: SCREEN_W, height: HERO_H },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
    backgroundColor: 'transparent',
  },

  // Title block
  titleBlock: { padding: 20, gap: 6 },
  categoryBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, marginBottom: 4,
  },
  categoryBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  destName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  destSubtitle: { fontSize: 14 },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    marginTop: 16, paddingVertical: 14,
    borderWidth: 1, borderRadius: 16,
  },
  statItem: { alignItems: 'center', gap: 3, flex: 1 },
  statValue: { fontSize: 15, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, height: 32 },

  // Tabs
  tabRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginTop: 8,
  },
  tabScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, alignItems: 'center',
  },
  tabPillText: { fontSize: 12.5, fontWeight: '700' },

  // Content
  tabContent: { padding: 20 },
  cardContainer: { gap: 10 },
  contentHeading: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  contentBody: { fontSize: 14, lineHeight: 23 },

  // Highlights
  highlightsContainer: { gap: 10 },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  highlightNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightNumberText: {
    fontSize: 12,
    fontWeight: '800',
  },
  highlightTextCol: {
    flex: 1,
    gap: 2,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  highlightDesc: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Practical Grid
  practicalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  practicalCard: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  practicalLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  practicalValue: {
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 17,
  },

  // Etiquette
  etiquetteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  etiquetteIconWrap: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  etiquetteItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  etiquetteDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  etiquetteRule: { flex: 1, fontSize: 13.5, lineHeight: 20 },

  // Ask MEERUP Prompts
  askSection: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  askSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiSparkleBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  askSectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  promptsCol: {
    gap: 6,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  promptChipText: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Map
  mapCard: {
    marginHorizontal: 20, borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8,
  },
  mapPlaceholder: {
    height: 140, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  mapGrid: {
    position: 'absolute', left: 0, right: 0, top: '33%',
    borderTopWidth: 1, borderBottomWidth: 1,
  },
  mapGridH: {
    position: 'absolute', top: 0, bottom: 0, left: '33%',
    borderLeftWidth: 1, borderRightWidth: 1,
  },
  mapPin: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  mapPlaceholderLabel: { marginTop: 6, fontSize: 11, fontWeight: '600' },
  viewOnMapPill: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewOnMapText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  mapActions: {
    flexDirection: 'row', borderTopWidth: 1,
  },
  mapBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRightWidth: 0.5,
  },
  mapBtnText: { fontSize: 13, fontWeight: '600' },

  // Sticky Actions Bar
  stickyBottom: {
    borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10,
  },
  stickyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  askCompanionBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    elevation: 2,
  },
  askCompanionText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  arQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  arQuickText: { fontSize: 13, fontWeight: '600' },

  // Not found
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16 },
  backLink: { fontSize: 14, fontWeight: '600' },
});
