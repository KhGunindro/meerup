import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Linking,
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

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = 260;

type Tab = 'why' | 'etiquette';

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

  const openMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${dest.lat},${dest.lng}`;
    Linking.openURL(url);
  };

  const cardBg = isDark ? colors.backgroundElement : '#FFFFFF';
  const sectionBg = isDark ? '#1A1C24' : '#F3F4F6';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── FLOATING TOP BAR ─────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.topBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.9)' }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topRight}>
          <TouchableOpacity
            onPress={() => setBookmarked((b) => !b)}
            style={[styles.topBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.9)' }]}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={bookmarked ? colors.accent : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.9)' }]}>
            <Ionicons name="share-social-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* ── HERO IMAGE ───────────────────────────── */}
        <View style={styles.heroWrap}>
          <Image source={getDestImg(dest.id)} style={styles.heroImage} resizeMode="cover" />
          {/* gradient overlay */}
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
          <View style={[styles.statsRow, { borderColor: colors.border }]}>
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

        {/* ── TAB PILLS ────────────────────────────── */}
        <View style={[styles.tabRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          {(['why', 'etiquette'] as Tab[]).map((t) => {
            const isActive = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[
                  styles.tabPill,
                  isActive
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: sectionBg },
                ]}>
                <Text style={[styles.tabPillText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                  {t === 'why' ? 'Why Visit' : 'Etiquette'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── TAB CONTENT ──────────────────────────── */}
        <View style={[styles.tabContent, { backgroundColor: colors.background }]}>
          {tab === 'why' ? (
            <>
              <Text style={[styles.contentHeading, { color: colors.text }]}>The Ancient Citadel of Kings</Text>
              <Text style={[styles.contentBody, { color: colors.textSecondary }]}>
                {dest.whyVisit}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.etiquetteHeader}>
                <View style={[styles.etiquetteIconWrap, { backgroundColor: isDark ? '#1A1200' : '#FEF3C7' }]}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
                </View>
                <Text style={[styles.contentHeading, { color: colors.text }]}>Sacred Etiquette</Text>
              </View>
              {dest.etiquette.split('. ').filter(Boolean).map((rule, i) => (
                <View key={i} style={styles.etiquetteItem}>
                  <View style={[styles.etiquetteDot, { backgroundColor: colors.accent }]} />
                  <Text style={[styles.etiquetteRule, { color: colors.textSecondary }]}>
                    {rule.endsWith('.') ? rule : rule + '.'}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* ── MAP CARD ─────────────────────────────── */}
        <View style={[styles.mapCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
          {/* Static map placeholder with grid lines */}
          <View style={[styles.mapPlaceholder, { backgroundColor: isDark ? '#12181F' : '#E8F4F8' }]}>
            <View style={[styles.mapGrid, { borderColor: isDark ? '#1E2B35' : '#C8DDE8' }]} />
            <View style={[styles.mapGridH, { borderColor: isDark ? '#1E2B35' : '#C8DDE8' }]} />
            <View style={[styles.mapPin, { backgroundColor: '#DC2626' }]}>
              <Ionicons name="location" size={14} color="#FFF" />
            </View>
            <Text style={[styles.mapPlaceholderLabel, { color: colors.textSecondary }]}>
              {dest.mapLabel}
            </Text>
          </View>

          {/* Map action buttons */}
          <View style={[styles.mapActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.mapBtn, { borderRightColor: colors.border }]}
              onPress={openMaps}>
              <Ionicons name="map-outline" size={15} color={colors.primary} />
              <Text style={[styles.mapBtnText, { color: colors.primary }]}>{dest.mapLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapBtn} onPress={openMaps}>
              <Ionicons name="navigate" size={15} color={colors.primary} />
              <Text style={[styles.mapBtnText, { color: colors.primary }]}>Open Navigation</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── BOTTOM SPACE ─────────────────────────── */}
        <View style={{ height: insets.bottom + 80 }} />
      </ScrollView>

      {/* ── STICKY BOTTOM CTA ────────────────────── */}
      <View style={[styles.stickyBottom, {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom + 12,
      }]}>
        <TouchableOpacity
          style={[styles.askMeerupBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/meerup' as any)}>
          <Ionicons name="sparkles" size={16} color="#FFF" />
          <Text style={styles.askMeerupText}>Ask MEERUP about this place</Text>
        </TouchableOpacity>
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
    // Simple dark fade overlay
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
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  tabPill: {
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 20, flex: 1, alignItems: 'center',
  },
  tabPillText: { fontSize: 13, fontWeight: '700' },

  // Content
  tabContent: { padding: 20, gap: 12 },
  contentHeading: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  contentBody: { fontSize: 14, lineHeight: 22 },

  // Etiquette
  etiquetteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  etiquetteIconWrap: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  etiquetteItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  etiquetteDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  etiquetteRule: { flex: 1, fontSize: 14, lineHeight: 21 },

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
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#DC2626', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4,
  },
  mapPlaceholderLabel: { position: 'absolute', bottom: 8, fontSize: 11 },
  mapActions: {
    flexDirection: 'row', borderTopWidth: 1,
  },
  mapBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRightWidth: 0.5,
  },
  mapBtnText: { fontSize: 13, fontWeight: '600' },

  // Sticky CTA
  stickyBottom: {
    borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12,
  },
  askMeerupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16,
  },
  askMeerupText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Not found
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16 },
  backLink: { fontSize: 14, fontWeight: '600' },
});
