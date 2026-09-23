import React, { useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DestinationCard } from '@/utils/meerupApi';
import { Colors } from '@/constants/theme';

interface RecommendationCardItemProps {
  card: DestinationCard;
  compact?: boolean;
}

export function RecommendationCardItem({ card, compact = false }: RecommendationCardItemProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'social' | 'tips'>('overview');

  const handleDirections = () => {
    router.push({
      pathname: '/map',
      params: {
        destLat: card.coordinates.latitude.toString(),
        destLng: card.coordinates.longitude.toString(),
        destName: card.title,
        destCategory: card.categories?.[0] || 'attraction',
        destImage: card.hero_image,
      },
    });
  };

  const handleShare = async () => {
    try {
      const message = `Check out ${card.title} in Manipur! ${card.subtitle}\n${card.description}\nBest time: ${card.web_recommendations.best_time_to_visit}`;
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        alert('Copied destination summary to clipboard!');
      } else {
        await Share.share({ message, title: card.title });
      }
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const openUrl = (url: string) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.warn('Could not open URL:', err));
    }
  };

  const bgCard = isDark ? '#1F2937' : '#FFFFFF';
  const borderCard = isDark ? '#374151' : '#E5E7EB';
  const pillBg = isDark ? '#374151' : '#F3F4F6';

  return (
    <View style={[styles.card, { backgroundColor: bgCard, borderColor: borderCard }]}>
      {/* ── HERO IMAGE & BADGES ── */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: card.hero_image }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlayTop}>
          {card.badge ? (
            <View style={styles.badgePill}>
              <MaterialIcons name="stars" size={12} color="#FFF" />
              <Text style={styles.badgeText}>{card.badge}</Text>
            </View>
          ) : <View />}

          <View style={styles.distancePill}>
            <MaterialIcons name="near-me" size={11} color="#047857" />
            <Text style={styles.distanceText}>
              {card.distance_km > 0 ? `${card.distance_km} km` : card.district}
            </Text>
          </View>
        </View>

        {card.web_recommendations.rating && (
          <View style={styles.ratingBadge}>
            <MaterialIcons name="star" size={13} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {card.web_recommendations.rating.toFixed(1)}
            </Text>
            {card.web_recommendations.review_count && (
              <Text style={styles.reviewCountText}>
                ({card.web_recommendations.review_count})
              </Text>
            )}
          </View>
        )}
      </View>

      {/* ── CARD HEADER & DESCRIPTION ── */}
      <View style={styles.bodyContainer}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {card.title}
            </Text>
            <Text style={styles.subtitle}>{card.subtitle}</Text>
          </View>
        </View>

        <Text style={[styles.description, { color: isDark ? '#D1D5DB' : '#4B5563' }]} numberOfLines={expanded ? 10 : 2}>
          {card.description}
        </Text>

        {/* ── QUICK METRICS PILLS ── */}
        <View style={styles.metricsRow}>
          {card.web_recommendations.best_time_to_visit ? (
            <View style={[styles.metricPill, { backgroundColor: pillBg }]}>
              <MaterialIcons name="wb-sunny" size={12} color="#D97706" />
              <Text style={styles.metricText} numberOfLines={1}>
                {card.web_recommendations.best_time_to_visit}
              </Text>
            </View>
          ) : null}

          {card.web_recommendations.entry_fee ? (
            <View style={[styles.metricPill, { backgroundColor: pillBg }]}>
              <MaterialIcons name="confirmation-number" size={12} color="#047857" />
              <Text style={styles.metricText} numberOfLines={1}>
                {card.web_recommendations.entry_fee}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── EXPANDABLE SOCIAL & WEB TABS ── */}
        {expanded && (
          <View style={styles.expandedSection}>
            {/* Tabs Selector */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                onPress={() => setActiveTab('overview')}
                style={[styles.tabButton, activeTab === 'overview' && styles.activeTabButton]}
              >
                <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
                  Web Insights
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('social')}
                style={[styles.tabButton, activeTab === 'social' && styles.activeTabButton]}
              >
                <Text style={[styles.tabText, activeTab === 'social' && styles.activeTabText]}>
                  Instagram & Vlogs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('tips')}
                style={[styles.tabButton, activeTab === 'tips' && styles.activeTabButton]}
              >
                <Text style={[styles.tabText, activeTab === 'tips' && styles.activeTabText]}>
                  Traveler Tips
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab 1: Web Insights */}
            {activeTab === 'overview' && (
              <View style={styles.tabContent}>
                {card.web_recommendations.top_search_snippets.map((snip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.snippetItem}
                    onPress={() => openUrl(snip.url)}
                  >
                    <View style={styles.snippetHeader}>
                      <MaterialIcons name="public" size={13} color="#2563EB" />
                      <Text style={styles.snippetTitle} numberOfLines={1}>
                        {snip.title}
                      </Text>
                    </View>
                    <Text style={styles.snippetBody} numberOfLines={2}>
                      {snip.snippet}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Tab 2: Instagram Spots & YouTube Vlogs */}
            {activeTab === 'social' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionHeaderTitle}>📸 Top Instagram Photo Spots</Text>
                {card.social_recommendations.instagram_spots.map((spot, idx) => (
                  <View key={idx} style={styles.spotRow}>
                    <MaterialIcons name="photo-camera" size={13} color="#E11D48" />
                    <Text style={styles.spotText}>{spot}</Text>
                  </View>
                ))}

                <Text style={[styles.sectionHeaderTitle, { marginTop: 10 }]}>🎬 YouTube Vlogs</Text>
                {card.social_recommendations.youtube_vlogs.map((vlog, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.vlogRow}
                    onPress={() => openUrl(vlog.url)}
                  >
                    <MaterialIcons name="play-circle-fill" size={16} color="#DC2626" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vlogTitle} numberOfLines={1}>{vlog.title}</Text>
                      <Text style={styles.vlogChannel}>{vlog.channel}</Text>
                    </View>
                    <MaterialIcons name="open-in-new" size={12} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Tab 3: Traveler Tips */}
            {activeTab === 'tips' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionHeaderTitle}>💡 Community Traveler Advice</Text>
                {card.social_recommendations.traveler_tips.map((tip, idx) => (
                  <View key={idx} style={styles.tipRow}>
                    <MaterialIcons name="check-circle" size={13} color="#059669" />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}

                <View style={styles.hashtagRow}>
                  {card.social_recommendations.hashtags.map((tag, idx) => (
                    <View key={idx} style={styles.hashtagPill}>
                      <Text style={styles.hashtagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── EXPAND / COLLAPSE TOGGLE ── */}
        <TouchableOpacity
          style={styles.expandToggle}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandToggleText}>
            {expanded ? 'Show Less' : 'Explore Web & Social Highlights'}
          </Text>
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={16}
            color="#2563EB"
          />
        </TouchableOpacity>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.directionsBtn}
            onPress={handleDirections}
            accessibilityRole="button"
          >
            <MaterialIcons name="directions" size={16} color="#FFF" />
            <Text style={styles.directionsBtnText}>Get Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareBtn, { borderColor: borderCard }]}
            onPress={handleShare}
            accessibilityRole="button"
          >
            <MaterialIcons name="share" size={16} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  imageContainer: {
    height: 150,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#047857',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    color: '#FFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  reviewCountText: {
    color: '#D1D5DB',
    fontSize: 10,
  },
  bodyContainer: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 17,
    marginVertical: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  metricText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 4,
  },
  expandToggleText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#2563EB',
  },
  expandedSection: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  tabButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#047857',
  },
  tabText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#047857',
    fontWeight: '700',
  },
  tabContent: {
    paddingVertical: 4,
  },
  snippetItem: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  snippetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  snippetTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1D4ED8',
    flex: 1,
  },
  snippetBody: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 15,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 5,
  },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  spotText: {
    fontSize: 11.5,
    color: '#374151',
    flex: 1,
  },
  vlogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#F9FAFB',
    padding: 6,
    borderRadius: 8,
    marginBottom: 5,
  },
  vlogTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1F2937',
  },
  vlogChannel: {
    fontSize: 10,
    color: '#6B7280',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 11.5,
    color: '#374151',
    flex: 1,
    lineHeight: 16,
  },
  hashtagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  hashtagPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hashtagText: {
    fontSize: 10.5,
    color: '#0369A1',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  directionsBtn: {
    flex: 1,
    backgroundColor: '#047857',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  directionsBtnText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  shareBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#F9FAFB',
  },
});
