import React, { useMemo, useState, useEffect } from 'react';
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
import { useLocation } from '@/hooks/use-location';
import { MeeteilonTranslator } from '@/components/MeeteilonTranslator';

const HOME_CARDS = DESTINATIONS.slice(0, 3);

function getTimeOfDayInfo() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      greeting: 'Good morning, Explorer',
      sub: 'The valley mist is lifting over the sacred groves.\nWhere shall we wander?',
      period: 'Morning Mist',
      temp: '22°C',
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      greeting: 'Good afternoon, Explorer',
      sub: 'Sunlight illuminates the ancient citadels and bustling markets.\nWhere would you like to explore?',
      period: 'Sunny Valley',
      temp: '26°C',
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      greeting: 'Good evening, Explorer',
      sub: 'Dusk settles over Loktak Lake and temple bells echo.\nReady for an evening stroll?',
      period: 'Golden Hour',
      temp: '23°C',
    };
  } else {
    return {
      greeting: 'Peaceful night, Explorer',
      sub: 'The quiet stars watch over the tranquil Manipur valley.\nPlanning tomorrow’s adventure?',
      period: 'Starlit Night',
      temp: '19°C',
    };
  }
}

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';
  const router = useRouter();
  const { location, locationLabel, getFormattedDistance } = useLocation();
  const timeInfo = useMemo(() => getTimeOfDayInfo(), []);
  const [meerupQuery, setMeerupQuery] = useState('');
  const [realTemp, setRealTemp] = useState<string | null>(null);
  const [realPeriod, setRealPeriod] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const lat = (location as any)?.lat || 24.8170; // Default to Imphal
        const lng = (location as any)?.lng || 93.9368;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
        );
        if (res.ok) {
          const data = await res.json();
          const temp = Math.round(data.current_weather.temperature);
          const code = data.current_weather.weathercode;
          
          let desc = 'Clear Sky';
          if (code >= 1 && code <= 2) desc = 'Partly Cloudy';
          else if (code === 3) desc = 'Overcast';
          else if (code === 45 || code === 48) desc = 'Misty Fog';
          else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) desc = 'Rainy';
          else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) desc = 'Snowy';
          else if (code >= 95) desc = 'Thunderstorms';

          setRealTemp(`${temp}°C`);
          setRealPeriod(desc);
        }
      } catch (err) {
        console.warn('Weather fetch error:', err);
      }
    };
    fetchWeather();
  }, [(location as any)?.lat, (location as any)?.lng]);

  const handleAskMeerup = (query?: string) => {
    const text = (query ?? meerupQuery).trim();
    if (!text) return;
    setMeerupQuery('');
    router.push({
      pathname: '/meerup',
      params: { prompt: text },
    } as any);
  };

  const cardBg = isDark ? colors.backgroundElement : '#FFFFFF';
  const sectionBg = isDark ? colors.backgroundElement : '#F8F9FB';

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* ── GREETING ─────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.tagRow}>
          <Text style={[styles.companionTag, { color: colors.accent }]}>
            SANCTUARY COMPANION
          </Text>
          <View style={[styles.weatherPill, { backgroundColor: sectionBg, borderColor: colors.border }]}>
            <View style={[styles.liveIndicator, { backgroundColor: '#22C55E' }]} />
            <Text style={[styles.weatherText, { color: colors.textSecondary }]}>
              {realTemp || timeInfo.temp} · {realPeriod || timeInfo.period}
            </Text>
          </View>
        </View>
        <Text style={[styles.greetTitle, { color: colors.text }]}>{timeInfo.greeting}</Text>
        <Text style={[styles.greetSub, { color: colors.textSecondary }]}>
          {timeInfo.sub}
        </Text>
      </View>

      {/* ── ASK MEERUP CARD ──────────────────────── */}
      <View style={[styles.askCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <View style={styles.askCardHeader}>
          <Text style={[styles.askCardTitle, { color: colors.text }]}>Ask MEERUP</Text>
          <View style={[styles.sparkleChip, { backgroundColor: isDark ? '#2D2000' : '#FEF3C7' }]}>
            <Ionicons name="sparkles" size={13} color={colors.accent} />
          </View>
        </View>
        <View style={[styles.inputRow, { backgroundColor: sectionBg, borderColor: colors.border }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Ask MEERUP about places, food, rituals..."
            placeholderTextColor={colors.textSecondary}
            value={meerupQuery}
            onChangeText={setMeerupQuery}
            onSubmitEditing={() => handleAskMeerup()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendAskBtn, { backgroundColor: meerupQuery.trim() ? colors.primary : (isDark ? '#2A2C38' : '#E5E7EB') }]}
            onPress={() => handleAskMeerup()}
            disabled={!meerupQuery.trim()}
            accessibilityLabel="Send to MEERUP"
          >
            <Ionicons
              name="arrow-up"
              size={15}
              color={meerupQuery.trim() ? '#FFFFFF' : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── LIVE TRANSLATION (MEETEILON / MANIPURI) ── */}
      <MeeteilonTranslator />

      {/* ── EXPLORE MANIPUR ──────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore Manipur</Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              Sacred citadels, floating waters, living craft
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/explore' as any)}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {HOME_CARDS.map((place) => (
            <TouchableOpacity
              key={place.id}
              onPress={() => router.push(('/destination/' + place.id) as any)}
              style={[styles.exploreCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
              <View style={styles.exploreImageWrap}>
                <Image source={getDestImg(place.id)} style={styles.exploreImage} resizeMode="cover" />
                <View style={[styles.explorebadge, { backgroundColor: place.badgeColor }]}>
                  <Text style={styles.explorebadgeText}>{place.badge}</Text>
                </View>
              </View>
              <View style={styles.exploreCardBody}>
                <Text style={[styles.exploreCardName, { color: colors.text }]}>{place.name}</Text>
                <Text style={[styles.exploreCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                 {place.descShort}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── NEAR YOU ─────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Near You</Text>
          <View style={[styles.liveBadge, { backgroundColor: isDark ? '#052E16' : '#DCFCE7' }]}>
            <View style={[styles.liveIndicator, { backgroundColor: '#22C55E' }]} />
            <Text style={[styles.liveBadgeText, { color: '#16A34A' }]}>Live Geofence</Text>
          </View>
        </View>

        {[
          {
            icon: 'business-outline' as const,
            id: 'kangla-fort',
            title: 'Kangla Fort',
            lat: 24.8080,
            lng: 93.9400,
            dist: '350m',
            open: true,
            openText: 'Open until 6:00 PM today',
            sub: 'Royal polo relics, handlooms...',
          },
          {
            icon: 'storefront-outline' as const,
            id: 'ima-keithel',
            title: 'Ima Keithel',
            lat: 24.8074,
            lng: 93.9358,
            dist: '800m',
            open: false,
            openText: 'Opens at 7:00 AM',
            sub: 'Royal polo relics, handlooms & ...',
          },
        ].map((item) => {
          const liveDist = getFormattedDistance(item.lat, item.lng, item.dist);
          return (
            <TouchableOpacity
              key={item.title}
              activeOpacity={0.85}
              onPress={() => router.push(('/destination/' + item.id) as any)}
              style={[styles.nearCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
              <View style={[styles.nearIcon, { backgroundColor: isDark ? '#1A1C24' : '#F3F4F6' }]}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.nearInfo}>
                <View style={styles.nearTopRow}>
                  <Text style={[styles.nearTitle, { color: colors.text }]}>{item.title}</Text>
                  <View style={[styles.nearOpenBadge, {
                    backgroundColor: item.open
                      ? (isDark ? '#052E16' : '#DCFCE7')
                      : (isDark ? '#1C1917' : '#F3F4F6'),
                  }]}>
                    <Text style={[styles.nearOpenText, { color: item.open ? '#16A34A' : colors.textSecondary }]}>
                      {item.open ? 'Open' : 'Closed'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.nearDist, { color: colors.accent }]}>
                  {liveDist} · {item.openText}
                </Text>
                <Text style={[styles.nearSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.sub}
                </Text>
              </View>
              <View style={[styles.nearArrow, { backgroundColor: sectionBg }]}>
                <Ionicons name="navigate-outline" size={16} color={colors.primary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── HAPPENING SOON ───────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Happening Soon</Text>
          <TouchableOpacity style={[styles.calendarBtn, { borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.calendarText, { color: colors.textSecondary }]}>Festival Calendar</Text>
          </TouchableOpacity>
        </View>

        {[
          {
            id: 'sangai-festival',
            imgId: 'sangai-festival',
            tag: 'Starts Nov 21 · Imphal Valley',
            name: 'Sangai Festival Preview',
            desc: "Manipur's flagship celebration of classical Raas Leela, martial arts (Thang-Ta), indigenous water sports, and culinary rituals.",
            cta: 'RSVP Itinerary',
          },
          // {
          //   id: 'sangai-festival',
          //   imgId: 'thabal',
          //   tag: 'Mar 16-22 · Imphal Valley',
          //   name: 'Yaoshang Thabal Chongba',
          //   desc: 'Traditional moonlit circle dance uniting valley youth under lantern-lit bamboo groves with live percussion.',
          //   cta: 'Learn More',
          // },
        ].map((event) => (
          <TouchableOpacity
            key={event.name}
            activeOpacity={0.92}
            onPress={() => router.push(('/destination/' + event.id) as any)}
            style={[styles.eventCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
            <View style={styles.eventImageWrap}>
              <Image source={getDestImg(event.imgId)} style={styles.eventImage} resizeMode="cover" />
              <View style={styles.eventTagOverlay}>
                <Ionicons name="calendar" size={11} color="#FFFFFF" />
                <Text style={styles.eventTag}>{event.tag}</Text>
              </View>
            </View>
            <View style={styles.eventBody}>
              <Text style={[styles.eventName, { color: colors.text }]}>{event.name}</Text>
              <Text style={[styles.eventDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                {event.desc}
              </Text>
              <TouchableOpacity
                style={[styles.eventCta, { borderColor: colors.primary }]}
                onPress={() => router.push(('/destination/' + event.id) as any)}>
                <Text style={[styles.eventCtaText, { color: colors.primary }]}>{event.cta}</Text>
                <Ionicons name="arrow-forward" size={13} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TASTE MANIPUR ────────────────────────── */}
      <View style={[styles.section, styles.lastSection]}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Taste Manipur</Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              Ancestral recipes steeped in indigenous soil
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => router.push(('/destination/chak-hao-singju') as any)}
          style={[styles.tasteFeatureCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
          <Image source={getDestImg('chak-hao-singju')} style={styles.tasteFeatureImage} resizeMode="cover" />
          <View style={styles.tasteFeatureOverlay}>
            <View style={[styles.tasteFeatBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.tasteFeatBadgeText}>Meitei Feast Special</Text>
            </View>
            <Text style={styles.tasteFeatureName}>Chak-hao & Singju Pairing</Text>
          </View>
        </TouchableOpacity>

        {[
          {
            name: 'Chak-hao',
            desc: 'Royal purple organic black rice simmered slowly with tiny beans, green coriander, and rich local cream -- garnished by crisp artisanal garden herbs and toasted perilla seeds.',
          },
          {
            name: 'Singju',
            desc: 'Piquant salad of lotus stem with lotus seeds & fermented ngari with bitter-lemon it balanced greens with blue flower & fermented pickle.',
          },
          {
            name: 'Kangshoi',
            desc: 'Cleansing broth with ginger lily and seasoned millet greens.',
          },
        ].map((dish) => (
          <View key={dish.name} style={[styles.dishRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.dishBullet, { backgroundColor: colors.accent }]} />
            <View style={styles.dishInfo}>
              <Text style={[styles.dishName, { color: colors.text }]}>
                {dish.name}:{' '}
                <Text style={[styles.dishDesc, { color: colors.textSecondary }]}>{dish.desc}</Text>
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, alignItems: 'center' },

  section: { width: '100%', maxWidth: MaxContentWidth, marginBottom: 28 },
  lastSection: { marginBottom: 0 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  sectionSub: { fontSize: 12, marginTop: 2 },
  seeAll: { fontSize: 13, fontWeight: '600' },

  // Greeting
  tagRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  companionTag: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' },
  weatherPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  liveIndicator: { width: 7, height: 7, borderRadius: 4 },
  weatherText: { fontSize: 11, fontWeight: '500' },
  greetTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  greetSub: { fontSize: 14, lineHeight: 21 },

  // Ask card
  askCard: {
    width: '100%', maxWidth: MaxContentWidth, borderRadius: 20, borderWidth: 1,
    padding: 16, gap: 12, marginBottom: 24,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6,
  },
  askCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  askCardTitle: { fontSize: 15, fontWeight: '700' },
  sparkleChip: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
  },
  input: { flex: 1, fontSize: 13, padding: 0 },
  sendAskBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  pillsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  filterPillText: { fontSize: 12, fontWeight: '500' },

  // Explore cards (horizontal)
  hScroll: { paddingRight: 4, gap: 12 },
  exploreCard: {
    width: 200, borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6,
  },
  exploreImageWrap: { width: '100%', height: 130 },
  exploreImage: { width: '100%', height: '100%' },
  explorebadge: {
    position: 'absolute', bottom: 8, left: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  explorebadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  exploreCardBody: { padding: 10, gap: 4 },
  exploreCardName: { fontSize: 14, fontWeight: '700' },
  exploreCardDesc: { fontSize: 12, lineHeight: 17 },

  // Near You
  nearCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4,
  },
  nearIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nearInfo: { flex: 1 },
  nearTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  nearTitle: { fontSize: 14, fontWeight: '700' },
  nearOpenBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  nearOpenText: { fontSize: 11, fontWeight: '600' },
  nearDist: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  nearSub: { fontSize: 12 },
  nearArrow: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Happening soon
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  liveBadgeText: { fontSize: 11, fontWeight: '700' },
  calendarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  calendarText: { fontSize: 12, fontWeight: '500' },
  eventCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6,
  },
  eventImageWrap: { width: '100%', height: 140 },
  eventImage: { width: '100%', height: '100%' },
  eventTagOverlay: {
    position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  eventTag: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  eventBody: { padding: 14, gap: 8 },
  eventName: { fontSize: 15, fontWeight: '700' },
  eventDesc: { fontSize: 13, lineHeight: 19 },
  eventCta: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5,
  },
  eventCtaText: { fontSize: 13, fontWeight: '700' },

  // Taste Manipur
  tasteFeatureCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 14,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6,
  },
  tasteFeatureImage: { width: '100%', height: 180 },
  tasteFeatureOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 14, gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tasteFeatBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tasteFeatBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  tasteFeatureName: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  dishRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  dishBullet: { width: 7, height: 7, borderRadius: 4, marginTop: 5 },
  dishInfo: { flex: 1 },
  dishName: { fontSize: 13, lineHeight: 20, fontWeight: '600' },
  dishDesc: { fontWeight: '400' },
});
