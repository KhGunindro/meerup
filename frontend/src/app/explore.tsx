import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors, MaxContentWidth } from '@/constants/theme';
import { getDestImg } from '@/constants/images';
import { DESTINATIONS } from '@/constants/destinations';
import { openTurnByTurnNavigation } from '@/utils/navigation';


const FILTERS = ['All', 'Sacred Sites', 'Nature', 'Markets', 'Food', 'Festivals'] as const;
type Filter = typeof FILTERS[number];


export default function ExploreScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [searchText, setSearchText] = useState('');

  const filtered = DESTINATIONS.filter((d) => {
    const matchesFilter = activeFilter === 'All' || d.category === activeFilter;
    const matchesSearch =
      searchText.trim() === '' ||
      d.name.toLowerCase().includes(searchText.toLowerCase()) ||
      d.descShort.toLowerCase().includes(searchText.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const cardBg = isDark ? colors.backgroundElement : '#FFFFFF';
  const sectionBg = isDark ? colors.backgroundElement : '#F8F9FB';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── SEARCH BAR ───────────────────────────── */}
      <View style={[styles.searchBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInput, { backgroundColor: sectionBg, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchText, { color: colors.text }]}
            placeholder="Search places, festivals, food..."
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── FILTER CHIPS ─────────────────────────── */}
      <View style={[styles.filtersBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}>
          {FILTERS.map((filter) => {
            const isActive = filter === activeFilter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filterChip,
                  isActive
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: sectionBg, borderColor: colors.border },
                ]}>
                <Text style={[styles.filterChipText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── RESULTS ──────────────────────────────── */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.resultsWrapper}>
          {/* Results count */}
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {filtered.length} place{filtered.length !== 1 ? 's' : ''} found
          </Text>

          {filtered.map((dest) => (
            <TouchableOpacity
              key={dest.id}
              activeOpacity={0.92}
              onPress={() => router.push(('/destination/' + dest.id) as any)}
              style={[styles.destCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
              {/* Image */}
              <View style={styles.destImageWrap}>
                <Image source={getDestImg(dest.id)} style={styles.destImage} resizeMode="cover" />
                {/* Badge */}
                <View style={[styles.destBadge, { backgroundColor: dest.badgeColor }]}>
                  <Text style={styles.destBadgeText}>{dest.badge}</Text>
                </View>
                {/* Bookmark */}
                <TouchableOpacity style={[styles.bookmarkBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)' }]}>
                  <Ionicons name="bookmark-outline" size={14} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={styles.destBody}>
                <View style={styles.destTopRow}>
                  <Text style={[styles.destName, { color: colors.text }]}>{dest.name}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={[styles.ratingText, { color: colors.text }]}>{dest.rating}</Text>
                  </View>
                </View>

                <Text style={[styles.destDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {dest.descShort}
                </Text>

                {/* Meta row */}
                <View style={styles.destMeta}>
                  <View style={styles.metaChip}>
                    <Ionicons name="location-outline" size={12} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{dest.dist}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons name="time-outline" size={12} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{dest.time}</Text>
                  </View>
                  <View style={[styles.categoryTag, { backgroundColor: isDark ? '#1A1C24' : '#F3F4F6' }]}>
                    <Text style={[styles.categoryTagText, { color: colors.textSecondary }]}>{dest.category}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.goBtn, { backgroundColor: colors.primary }]}
                    accessibilityLabel={`Navigate to ${dest.name}`}
                    onPress={() =>
                      router.push({
                        pathname: '/map',
                        params: {
                          destLat: dest.lat.toString(),
                          destLng: dest.lng.toString(),
                          destName: dest.name,
                          destCategory: dest.category,
                        },
                      })
                    }>
                    <Ionicons name="navigate" size={13} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Search
  searchBar: {
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  searchInput: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1,
  },
  searchText: { flex: 1, fontSize: 13, padding: 0 },

  // Filters
  filtersBar: { borderBottomWidth: 1, height: 52, justifyContent: 'center' },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: { fontSize: 12, fontWeight: '600' },

  // Results
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, alignItems: 'center' },
  resultsWrapper: { width: '100%', maxWidth: MaxContentWidth, gap: 14 },
  resultsCount: { fontSize: 12, fontWeight: '500', marginBottom: 4 },

  // Destination card
  destCard: {
    borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8,
  },
  destImageWrap: { width: '100%', height: 160 },
  destImage: { width: '100%', height: '100%' },
  destBadge: {
    position: 'absolute', top: 10, left: 10,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12,
  },
  destBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  bookmarkBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  destBody: { padding: 14, gap: 8 },
  destTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  destName: { fontSize: 16, fontWeight: '700', flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '600' },
  destDesc: { fontSize: 13, lineHeight: 18 },
  destMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12 },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryTagText: { fontSize: 11, fontWeight: '500' },
  goBtn: {
    marginLeft: 'auto', width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
});
