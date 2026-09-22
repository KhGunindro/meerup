import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedWaveBar = ({ baseHeight, color, delay }: { baseHeight: number; color: string; delay: number }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = 800 + (delay % 400);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: duration,
          delay: delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const scaleY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.2],
  });

  return (
    <Animated.View
      style={[
        styles.waveBar,
        {
          height: baseHeight,
          backgroundColor: color,
          transform: [{ scaleY }],
        },
      ]}
    />
  );
};

export default function MeerupScreen() {
  const insets = useSafeAreaInsets();
  const [aiState, setAiState] = useState<'listening' | 'thinking' | 'speaking'>('listening');
  const [inputText, setInputText] = useState('');
  const [activeCard, setActiveCard] = useState<'kangla' | 'ima'>('kangla');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida/AEtjO1X29_EoHGNbjM2PCS1nghaRaUzjbSMYHhGp8iHMi3tW9cRw729lYKzU-BM7srjPEnFeNYLrYNuHHw7Hgu8k5YpxCqIyDnYDoSLo0Fw0gMAwXt4SvkprbyzGJXmeBD-l15E_OHo3QJB8OEkY0viuYT6q7WiBnjx0TSmCrKBB-lTWJZrh7drZ_7_LTiJX5GeL7m_ZTN0KevrO0MwOHW8QMPkB0BxCTUe_jMhyapdeZww1M7DSw0NXOYAGTq4',
              }}
              style={styles.logo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.headerTitle}>MEERUP</Text>
              <View style={styles.locationContainer}>
                <View style={styles.blueDot} />
                <Text style={styles.locationText}>Imphal, Manipur</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAl3RnvpegqZISRG-SWSoZOBLnK_HoxtkefhzdD0mcmCYiByz6CbcYP16Z-NF6AlhSYKCRw3v2PHSyzy3iQ_X1a5mJLUJTbKSrY-29kB1NDc0PTZeZNQkKv8mz1rDCUQgWsgPhv4ZK_STGs_4PY8lvk12aqSreMrKz5dPgFdY3cKkmS9KPwAyZ5z8VvzObB48B2aJu1-5FnQwAREIGR3xtkx-WxLuy0qJd1oWXDm4NQq1tw2_LNIIWH',
              }}
              style={styles.profileAvatar}
            />
          </View>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* CONTEXT BADGE */}
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <View style={styles.orangeDot} />
            <Text style={styles.badgeText}>YOUR MANIPUR COMPANION</Text>
          </View>
          <Text style={styles.badgeSubtext}>Active Presence · Imphal Valley Sanctuary</Text>
        </View>

        {/* AI STATE TABS */}
        <View style={styles.stateTabs}>
          {(['listening', 'thinking', 'speaking'] as const).map((state) => (
            <TouchableOpacity
              key={state}
              onPress={() => setAiState(state)}
              style={[styles.stateTab, aiState === state ? styles.stateTabActive : styles.stateTabInactive]}
            >
              <View
                style={[
                  styles.stateTabDot,
                  aiState === state
                    ? styles.stateTabDotActive
                    : state === 'listening'
                    ? { backgroundColor: '#4777c2' }
                    : state === 'thinking'
                    ? { backgroundColor: '#9CA3AF' }
                    : { backgroundColor: '#D97706' },
                ]}
              />
              <Text
                style={[
                  styles.stateTabText,
                  aiState === state ? styles.stateTabTextActive : styles.stateTabTextInactive,
                ]}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CENTRAL ORB */}
        <View style={styles.orbContainer}>
          <TouchableOpacity
            style={[
              styles.orbOuter,
              aiState === 'listening' && { borderColor: '#4777c2' },
              aiState === 'thinking' && { borderColor: '#D97706', transform: [{ scale: 0.95 }] },
              aiState === 'speaking' && { borderColor: '#047857', backgroundColor: '#FEF3C7', transform: [{ scale: 1.05 }] },
            ]}
          >
            <View style={[styles.orbInner, aiState === 'listening' && { borderColor: '#4777c2' }]}>
              <MaterialIcons name="arrow-back-ios" size={24} color="#4777c2" style={{ marginLeft: 6 }} />
              <Text style={styles.orbText}>MEERUP</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.waveformContainer}>
            {aiState === 'listening' && (
              <>
                <AnimatedWaveBar baseHeight={12} color="#4777c2" delay={0} />
                <AnimatedWaveBar baseHeight={20} color="#4777c2" delay={100} />
                <AnimatedWaveBar baseHeight={24} color="#275BA5" delay={200} />
                <AnimatedWaveBar baseHeight={16} color="#4777c2" delay={300} />
                <AnimatedWaveBar baseHeight={28} color="#6B7280" delay={400} />
                <AnimatedWaveBar baseHeight={20} color="#4777c2" delay={500} />
                <AnimatedWaveBar baseHeight={12} color="#4777c2" delay={600} />
                <AnimatedWaveBar baseHeight={20} color="#275BA5" delay={700} />
                <AnimatedWaveBar baseHeight={8} color="#6B7280" delay={800} />
              </>
            )}
          </View>
        </View>

        {/* CHAT TRANSCRIPT */}
        <View style={styles.chatContainer}>
          {/* USER MESSAGE */}
          <View style={styles.userMessageWrapper}>
            <View style={styles.userBubble}>
              <Text style={styles.userMessageText}>I have two hours near Kangla and I love culture.</Text>
            </View>
            <View style={styles.messageFooter}>
              <Text style={styles.timeText}>You · 16:42 PM</Text>
              <MaterialIcons name="done-all" size={13} color="#047857" style={{ marginLeft: 4 }} />
            </View>
          </View>

          {/* AI RESPONSE */}
          <View style={styles.aiMessageWrapper}>
            <View style={styles.aiHeader}>
              <View style={styles.aiAvatar}>
                <MaterialIcons name="arrow-back-ios" size={10} color="#4777c2" style={{ marginLeft: 2 }} />
              </View>
              <Text style={styles.aiName}>MEERUP Companion</Text>
              <Text style={styles.timeText}>Just now</Text>
            </View>

            <View style={styles.aiBubble}>
              <Text style={styles.aiMessageText}>
                {activeCard === 'kangla' ? (
                  <>
                    Start with the sacred <Text style={{ color: '#275BA5', fontWeight: 'bold' }}>Kangla Dragon gate</Text> and Govindaji Temple, then walk 8 minutes toward <Text style={{ color: '#4777c2', fontWeight: 'bold' }}>Ima Keithel</Text> for the living heritage of Asia's largest mother-run market. I've mapped a low-traffic walking route for you.
                  </>
                ) : (
                  <>
                    Experience the vibrant energy of <Text style={{ color: '#4777c2', fontWeight: 'bold' }}>Ima Keithel</Text>, Asia's largest all-women market. Discover traditional textiles and the living heritage of Manipur, just a short walk from the <Text style={{ color: '#275BA5', fontWeight: 'bold' }}>Kangla Royal Enclosure</Text>.
                  </>
                )}
              </Text>

              {/* CARD 1 */}
              {activeCard === 'kangla' ? (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardImageContainer}>
                      <Image
                        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBkfbqJ9Qq_rORLswzZn7vc7V9fvl5mQGSuqPpdAsQ3P8q9UFOzJML17kKn3gVHAdBxJCtnLlJKtfQG89EA9S1weUmWGUuJnjnQFTpp9NAhyR-NKgza6hqU7xXUGuP2deu5Wf3Kp_l08ix_k5Zz73PGSI5maIZpKmfa5Ik39Chhhxsts8kI8FIx8P5HDKYfhybZ83CDcv4bhAeej_H7lToVkH2prKAo53PBEiNdI-UAGINFmChNlBP5' }}
                        style={styles.cardImage}
                      />
                      <View style={styles.tagOverlay}>
                        <Text style={styles.tagText}>SACRED</Text>
                      </View>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>Kangla Royal Enclosure</Text>
                      <View style={styles.cardStats}>
                        <MaterialIcons name="near-me" size={14} color="#D97706" />
                        <Text style={styles.statText}>350m</Text>
                        <Text style={styles.statDivider}>•</Text>
                        <MaterialIcons name="schedule" size={14} color="#047857" />
                        <Text style={styles.statText}>45 min</Text>
                      </View>
                      <View style={styles.cardStatus}>
                        <View style={[styles.statusDot, { backgroundColor: '#047857' }]} />
                        <Text style={styles.statusText}>Open now · Ceremonial Hours</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.primaryBtn}>
                      <MaterialIcons name="view-in-ar" size={16} color="white" />
                      <Text style={styles.primaryBtnText}>Open in AR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn}>
                      <MaterialIcons name="add-location-alt" size={16} color="#D97706" />
                      <Text style={styles.secondaryBtnText}>Add to Route</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Pressable style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]} onPress={() => setActiveCard('kangla')}>
                  <View style={styles.cardImageContainerSmall}>
                    <Image
                      source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBkfbqJ9Qq_rORLswzZn7vc7V9fvl5mQGSuqPpdAsQ3P8q9UFOzJML17kKn3gVHAdBxJCtnLlJKtfQG89EA9S1weUmWGUuJnjnQFTpp9NAhyR-NKgza6hqU7xXUGuP2deu5Wf3Kp_l08ix_k5Zz73PGSI5maIZpKmfa5Ik39Chhhxsts8kI8FIx8P5HDKYfhybZ83CDcv4bhAeej_H7lToVkH2prKAo53PBEiNdI-UAGINFmChNlBP5' }}
                      style={styles.cardImage}
                    />
                  </View>
                  <View style={styles.cardInfoSmall}>
                    <Text style={styles.cardTitle}>Kangla Royal Enclosure</Text>
                    <Text style={styles.cardSubtitle}>Sacred Site · 350m away</Text>
                  </View>
                  <View style={styles.cardRightSmall}>
                    <View style={[styles.vibrantTag, { backgroundColor: '#D1FAE5' }]}>
                      <Text style={[styles.vibrantTagText, { color: '#065F46' }]}>Open now</Text>
                    </View>
                    <Text style={styles.estTimeText}>Est. 45 min</Text>
                  </View>
                </Pressable>
              )}

              {/* CARD 2 */}
              {activeCard === 'ima' ? (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardImageContainer}>
                      <Image
                        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6bbhP82G51C-I2l1e27wDmF0iPgnbrbWPcVnG3eFp7Dv6JesrXmd4PJHtsO0_35ALdcqyE7V3D5AFRocYihcRQmHCGtkxqMK0YNLZr_OSKTvjefuFD0_VTihESVNm-q09fp9astfrxTq9ux-z2cVrz3ZE8z39udUkZI9h3NWrwi5fUXRN0JnXG8r_1QsHJC4xRDchgGLmdJoF77wMwrnGRpJUB2WZsgZ_C1ZxYzGAo16Q78ztTBm8' }}
                        style={styles.cardImage}
                      />
                      <View style={styles.tagOverlay}>
                        <Text style={styles.tagText}>HERITAGE</Text>
                      </View>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>Ima Keithel Market</Text>
                      <View style={styles.cardStats}>
                        <MaterialIcons name="near-me" size={14} color="#D97706" />
                        <Text style={styles.statText}>1.1km</Text>
                        <Text style={styles.statDivider}>•</Text>
                        <MaterialIcons name="schedule" size={14} color="#047857" />
                        <Text style={styles.statText}>50 min</Text>
                      </View>
                      <View style={styles.cardStatus}>
                        <View style={[styles.statusDot, { backgroundColor: '#D97706' }]} />
                        <Text style={[styles.statusText, { color: '#D97706' }]}>Vibrant now · Full Market</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.primaryBtn}>
                      <MaterialIcons name="view-in-ar" size={16} color="white" />
                      <Text style={styles.primaryBtnText}>Open in AR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn}>
                      <MaterialIcons name="add-location-alt" size={16} color="#D97706" />
                      <Text style={styles.secondaryBtnText}>Add to Route</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Pressable style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]} onPress={() => setActiveCard('ima')}>
                  <View style={styles.cardImageContainerSmall}>
                    <Image
                      source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6bbhP82G51C-I2l1e27wDmF0iPgnbrbWPcVnG3eFp7Dv6JesrXmd4PJHtsO0_35ALdcqyE7V3D5AFRocYihcRQmHCGtkxqMK0YNLZr_OSKTvjefuFD0_VTihESVNm-q09fp9astfrxTq9ux-z2cVrz3ZE8z39udUkZI9h3NWrwi5fUXRN0JnXG8r_1QsHJC4xRDchgGLmdJoF77wMwrnGRpJUB2WZsgZ_C1ZxYzGAo16Q78ztTBm8' }}
                      style={styles.cardImage}
                    />
                  </View>
                  <View style={styles.cardInfoSmall}>
                    <Text style={styles.cardTitle}>Ima Keithel Market</Text>
                    <Text style={styles.cardSubtitle}>Living Heritage · 1.1 km away</Text>
                  </View>
                  <View style={styles.cardRightSmall}>
                    <View style={styles.vibrantTag}>
                      <Text style={styles.vibrantTagText}>Vibrant now</Text>
                    </View>
                    <Text style={styles.estTimeText}>Est. 50 min</Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* SUGGESTIONS */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>SUGGESTED CULTURAL INQUIRIES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
            <TouchableOpacity style={styles.suggestionChip}>
              <MaterialIcons name="menu-book" size={16} color="#D97706" />
              <Text style={styles.suggestionChipText}>Tell me the legend of Kangla Sha</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.suggestionChip}>
              <MaterialIcons name="restaurant" size={16} color="#047857" />
              <Text style={styles.suggestionChipText}>Find authentic Chak-hao nearby</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.suggestionChip}>
              <MaterialIcons name="translate" size={16} color="#047857" />
              <Text style={styles.suggestionChipText}>Translate local phrase to Meiteilon</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>

      {/* BOTTOM INPUT */}
      <View style={[styles.bottomInputContainer, { paddingBottom: isKeyboardVisible ? 4 : Math.max(insets.bottom, 10) }]}>
        <View style={styles.bottomHeader}>
          <View style={styles.langSelector}>
            <MaterialIcons name="language" size={14} color="#D97706" />
            <Text style={styles.langText}>EN | Manipuri | Hindi</Text>
          </View>
          <View style={styles.engineIndicator}>
            <View style={styles.blueDot} />
            <Text style={styles.engineText}>Neural Voice Engine</Text>
          </View>
        </View>

        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.iconBtn}>
            <MaterialIcons name="photo-camera" size={20} color="#4B5563" />
          </TouchableOpacity>
          <View style={styles.textInputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Speak or ask MEERUP anything..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
            />
          </View>
          <TouchableOpacity style={styles.micBtn}>
            <MaterialIcons name="mic" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendBtn}>
            <MaterialIcons name="arrow-upward" size={20} color="#047857" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // HEADER
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 50,
  },
  headerContent: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: 0.5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4777c2',
  },
  locationText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // LAYOUT
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // BADGE
  badgeContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orangeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  badgeText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  badgeSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '500',
  },

  // STATE TABS
  stateTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stateTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  stateTabActive: {
    backgroundColor: '#4777c2',
    borderColor: '#4777c2',
  },
  stateTabInactive: {
    backgroundColor: 'white',
    borderColor: '#E5E7EB',
  },
  stateTabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stateTabDotActive: {
    backgroundColor: 'white',
  },
  stateTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stateTabTextActive: {
    color: 'white',
  },
  stateTabTextInactive: {
    color: '#4B5563',
  },

  // ORB
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 24,
  },
  orbOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    padding: 6,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  orbInner: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    borderWidth: 2,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#4777c2',
    marginTop: 2,
    letterSpacing: 1,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    height: 28,
    marginTop: 16,
    width: 200,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },

  // CHAT
  chatContainer: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  userMessageWrapper: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  userBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EEF2F6',
    borderRadius: 16,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userMessageText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    paddingRight: 4,
  },
  timeText: {
    fontSize: 10,
    color: '#6B7280',
  },
  aiMessageWrapper: {
    alignSelf: 'flex-start',
    maxWidth: '95%',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    paddingLeft: 4,
  },
  aiAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4777c2',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4777c2',
  },
  aiBubble: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    gap: 16,
  },
  aiMessageText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1F2937',
  },

  // CARDS
  card: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardImageContainerSmall: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginRight: 12,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  tagOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    elevation: 2,
  },
  tagText: {
    fontSize: 9,
    color: '#047857',
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
  },
  cardInfoSmall: {
    flex: 1,
  },
  cardRightSmall: {
    alignItems: 'flex-end',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#4B5563',
  },
  statDivider: {
    color: '#D1D5DB',
    marginHorizontal: 4,
  },
  cardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#047857',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#4777c2',
    borderRadius: 16,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
  },
  secondaryBtnText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },
  vibrantTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
  },
  vibrantTagText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: 'bold',
  },
  estTimeText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },

  // SUGGESTIONS
  suggestionsContainer: {
    marginBottom: 24,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 8,
    paddingLeft: 4,
  },
  suggestionsScroll: {
    paddingRight: 16,
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
  },

  // BOTTOM INPUT
  bottomInputContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bottomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  engineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engineText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputWrapper: {
    flex: 1,
    height: 40,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 12,
    color: '#111827',
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4777c2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
