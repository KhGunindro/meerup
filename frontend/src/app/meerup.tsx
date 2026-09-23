import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Dimensions,
  StatusBar,
  Linking,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// expo-av is loaded dynamically at runtime; provide type fallback for compile
type Audio = any;
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import {
  API_BASE_URL,
  DestinationCard,
  LandmarkResponse,
  WebSearchSnippet,
  askGroundedChat,
  fetchNearbyRecommendations,
  searchRecommendations,
  transcribeAudio,
  synthesizeTextToSpeech,
} from '@/utils/meerupApi';
import * as Location from 'expo-location';
import { DESTINATIONS } from '@/constants/destinations';
import { openTurnByTurnNavigation, getDistanceKm } from '@/utils/navigation';
import { RecommendationCardItem } from '@/components/destination/RecommendationCardItem';
import { LandmarkCameraModal } from '@/components/vision/LandmarkCameraModal';

// ─── Live LLM config ─────────────────────────────────────────────────────────
const LLM_BASE_URL = 'https://af1e-2409-40e7-408-6d82-4aef-9aa8-ca50-1f19.ngrok-free.app';
const LLM_MODEL = 'lmstudio-community/Qwen3-4B-Instruct-2507-GGUF:Q4_K_M';

interface UserContext {
  interests: string[];
  latitude: number | null;
  longitude: number | null;
  available_minutes: number | null;
}

function buildSystemPrompt(ctx: UserContext): string {
  let prompt = `You are MEERUP, a warm and knowledgeable AI travel companion and voice assistant for Manipur, India.
Always converse in clear, natural English as a friendly voice assistant.
Help tourists discover authentic cultural experiences, heritage sites, local food, festivals, and hidden gems.
Be concise — respond in 2-4 sentences unless a longer answer is clearly needed.
Respond in plain conversational text without markdown formatting.
When suggesting or recommending attractions or places, always explicitly mention their standard names (such as Kangla Fort, Loktak Lake, Keibul Lamjao, Ima Keithel, Govindaji Temple, Sendra, Andro Heritage Village) so travelers can navigate to them directly.`;

  if (ctx.latitude && ctx.longitude) {
    prompt += `\n\nUser's current location: latitude ${ctx.latitude.toFixed(4)}, longitude ${ctx.longitude.toFixed(4)} (Manipur region).`;
  }
  if (ctx.interests.length > 0) {
    prompt += `\nUser's interests: ${ctx.interests.join(', ')}.`;
  }
  if (ctx.available_minutes) {
    const hrs = ctx.available_minutes >= 60
      ? `${(ctx.available_minutes / 60).toFixed(1)} hours`
      : `${ctx.available_minutes} minutes`;
    prompt += `\nUser has approximately ${hrs} available.`;
  }
  prompt += `\nTailor all recommendations to these preferences when relevant.`;
  return prompt;
}

interface PlaceMention {
  name: string;
  lat: number;
  lng: number;
}

interface ChatResponseData {
  text: string;
  searchSnippets?: WebSearchSnippet[];
  places?: PlaceMention[];
  timeFeasible?: boolean;
}

async function askLLM(
  history: Array<{ role: string; content: string }>,
  userText: string,
  ctx: UserContext,
): Promise<ChatResponseData> {
  // 1. Primary: Grounded Search + AI Tourism Engine (eliminates hallucinations via live Google/DDG search & distance checks)
  try {
    const grounded = await askGroundedChat(
      userText,
      ctx.latitude || 24.8170,
      ctx.longitude || 93.9368,
      ctx.available_minutes || undefined,
      history
    );
    if (grounded && grounded.text) {
      const places: PlaceMention[] = (grounded.places || []).map(p => ({
        name: p.name,
        lat: p.lat,
        lng: p.lng,
      }));
      return {
        text: grounded.text,
        searchSnippets: grounded.search_snippets,
        places: places.length > 0 ? places : undefined,
        timeFeasible: grounded.time_feasible,
      };
    }
  } catch (backendErr) {
    console.warn('Backend Grounded Search+AI call unavailable, falling back:', backendErr);
  }

  // 2. Fallback to direct LM Studio endpoint
  const messages = [
    { role: 'system', content: buildSystemPrompt(ctx) },
    ...history,
    { role: 'user', content: userText },
  ];

  const candidateUrls = [
    `${LLM_BASE_URL}/v1/chat/completions`,
    `${LLM_BASE_URL}/chat/completions`,
    'http://localhost:8080/v1/chat/completions',
    'http://10.0.2.2:8080/v1/chat/completions',
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages,
          temperature: 0.5,
          max_tokens: 400,
          stream: false,
          enable_thinking: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return { text: content };
      }
    } catch (_err) {
      // Continue to next candidate
    }
  }

  // 3. Grounded Manipur tourism guidance fallback
  const q = userText.toLowerCase();
  if (q.includes('shirui') || q.includes('ukhrul') || q.includes('lily')) {
    return {
      text: "Shirui Kashong Peak in Ukhrul is home to the rare Shirui Lily (blooms late May–early June). The drive from Imphal takes 3.5 to 4 hours (95 km) via NH202, followed by a 2 to 3 hour steep mountain trek to the 2,835m peak. A full day (10+ hours) or overnight trip is required; short 2-hour trips are not possible.",
      places: [{ name: 'Shirui Kashong Peak', lat: 25.1167, lng: 94.4333 }],
    };
  }
  if (q.includes('ima') || q.includes('keithel') || q.includes('market')) {
    return {
      text: "Ima Keithel in central Imphal is Asia's largest all-women market with a 500-year history. Over 4,000 women vendors run stalls offering handloom textiles, fresh local produce, and spices. It is also an iconic site of the historic Nupi Lan resistance.",
      places: [{ name: 'Ima Keithel', lat: 24.8074, lng: 93.9358 }],
    };
  }
  if (q.includes('kangla') || q.includes('fort') || q.includes('palace')) {
    return {
      text: "Kangla Fort is the ancient seat of the Meitei rulers beside the Imphal River. It features the sacred twin Kangla Sha dragon-lions, the historic Govindaji temple ruins, and the holy Nungjeng Pukhri pond.",
      places: [{ name: 'Kangla Fort', lat: 24.8080, lng: 93.9400 }],
    };
  }
  if (q.includes('loktak') || q.includes('sendra') || q.includes('lake')) {
    return {
      text: "Loktak Lake is the world's only floating lake, celebrated for its circular floating phumdis. Visit Sendra Island for 360-degree panoramic views or take a canoe boat ride with local fishermen.",
      places: [{ name: 'Loktak Lake', lat: 24.5320, lng: 93.7810 }],
    };
  }
  if (q.includes('andro') || q.includes('pottery')) {
    return {
      text: "Andro is an ancient cultural heritage village renowned for coil pottery crafted exclusively by women, the Mutua Museum's traditional thatch huts, and a sacred fire kept burning for centuries.",
      places: [{ name: 'Andro Heritage Village', lat: 24.7500, lng: 94.0667 }],
    };
  }
  if (q.includes('sadu') || q.includes('waterfall') || q.includes('leimaram')) {
    return {
      text: "Sadu Chiru Waterfall is a beautiful three-tiered cascade inside green forested hills in Kangpokpi. A stone pathway leads to the falls—be sure to wear non-slip shoes!",
    };
  }
  return {
    text: "Welcome to Manipur! I can guide you to Kangla Fort, Loktak Lake, Ima Keithel market, and cultural heritage at Andro. Check the cards below for nearby destinations, directions, and Instagram photo spots!",
  };
}
// ───────────────────────────────────────────────────────────────────────────────

// ─── Place mention parser & Google Maps navigation ────────────────────────────
interface PlaceCandidate {
  name: string;
  lat: number;
  lng: number;
  patterns: RegExp[];
}

const PLACE_REGISTRY: PlaceCandidate[] = [
  {
    name: 'Kangla Fort',
    lat: 24.8080,
    lng: 93.9400,
    patterns: [/\bkangla(\s+fort)?\b/i],
  },
  {
    name: 'Loktak Lake',
    lat: 24.5320,
    lng: 93.7810,
    patterns: [/\bloktak(\s+lake)?\b/i, /\bsendra\b/i],
  },
  {
    name: 'Keibul Lamjao National Park',
    lat: 24.5020,
    lng: 93.7660,
    patterns: [/\bkeibul(\s+lamjao)?\b/i],
  },
  {
    name: 'Ima Keithel',
    lat: 24.8074,
    lng: 93.9358,
    patterns: [/\bima\s+(keithel|market)\b/i, /\bmother'?s\s+market\b/i, /\bkhwairamband\b/i],
  },
  {
    name: 'Govindaji Temple',
    lat: 24.7978,
    lng: 93.9485,
    patterns: [/\bgovinda?jee?(\s+temple)?\b/i],
  },
  {
    name: 'Sangai Festival',
    lat: 24.7960,
    lng: 93.9490,
    patterns: [/\bsangai\s+festival\b/i],
  },
  {
    name: 'INA Memorial, Moirang',
    lat: 24.5020,
    lng: 93.7660,
    patterns: [/\bina\s+memorial\b/i, /\bmoirang\b/i],
  },
  {
    name: 'Andro Heritage Village',
    lat: 24.7500,
    lng: 94.0667,
    patterns: [/\bandro(\s+village|\s+heritage)?\b/i],
  },
  {
    name: 'Dzukou Valley',
    lat: 25.5667,
    lng: 94.0667,
    patterns: [/\bdz[uu]ko[uu](\s+valley)?\b/i],
  },
  {
    name: 'Shirui Kashong Peak',
    lat: 25.1167,
    lng: 94.4333,
    patterns: [/\bshirui(\s+kashong|\s+peak|\s+lily)?\b/i, /\bukhrul\b/i],
  },
];

function parsePlaceMentions(text: string): PlaceMention[] {
  const found: PlaceMention[] = [];
  const seen = new Set<string>();

  for (const place of PLACE_REGISTRY) {
    if (place.patterns.some(p => p.test(text))) {
      if (!seen.has(place.name)) {
        seen.add(place.name);
        found.push({ name: place.name, lat: place.lat, lng: place.lng });
      }
    }
  }

  // Fallback check against any other destinations defined in DESTINATIONS
  for (const dest of DESTINATIONS) {
    if (!seen.has(dest.name)) {
      const regex = new RegExp(`\\b${dest.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        seen.add(dest.name);
        found.push({ name: dest.name, lat: dest.lat, lng: dest.lng });
      }
    }
  }

  return found;
}

function openInMaps(lat: number, lng: number, label: string) {
  openTurnByTurnNavigation(lat, lng, label);
}
// ──────────────────────────────────────────────────────────────────────────────

let AudioRuntime: typeof Audio | any;
try {
  AudioRuntime = require('expo-av').Audio;
} catch (e) {
  // expo-av fallback handled
}

let createAudioPlayer: any = null;
let useAudioRecorder: any = null;
let RecordingPresets: any = null;
let setAudioModeAsync: any = null;
let requestRecordingPermissionsAsync: any = null;

try {
  const expoAudio = require('expo-audio');
  createAudioPlayer = expoAudio.createAudioPlayer;
  useAudioRecorder = expoAudio.useAudioRecorder;
  RecordingPresets = expoAudio.RecordingPresets;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
  requestRecordingPermissionsAsync = expoAudio.requestRecordingPermissionsAsync;
} catch (e) {
  // expo-audio fallback handled
}

let activeWebAudio: any = null;
let activeNativeSound: any = null;

export const stopSpeechAudio = async (webViewRef?: any) => {
  try {
    if (activeWebAudio) {
      activeWebAudio.pause();
      activeWebAudio.currentTime = 0;
      activeWebAudio = null;
    }
    if (activeNativeSound) {
      if (typeof activeNativeSound.stop === 'function') activeNativeSound.stop();
      if (typeof activeNativeSound.stopAsync === 'function') await activeNativeSound.stopAsync();
      if (typeof activeNativeSound.unloadAsync === 'function') await activeNativeSound.unloadAsync();
      activeNativeSound = null;
    }
    if (webViewRef && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        (function() {
          var audios = document.querySelectorAll('audio');
          audios.forEach(function(a) { a.pause(); a.currentTime = 0; });
        })();
        true;
      `);
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).speechSynthesis) {
      (window as any).speechSynthesis.cancel();
    }
  } catch (e) {
    console.warn('stopSpeechAudio notice:', e);
  }
};

export const playSpeechAudio = async (base64Data: string, webViewRef?: any) => {
  if (!base64Data) return;

  // Stop any currently playing audio first
  await stopSpeechAudio(webViewRef);

  const cleanB64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  // 1. Web environment: HTML5 Audio
  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
    try {
      const snd = new (window as any).Audio(`data:audio/wav;base64,${cleanB64}`);
      activeWebAudio = snd;
      await snd.play();
      return;
    } catch (e) {
      console.warn('Web Audio playback notice:', e);
    }
  }

  // 2. expo-audio modern native player
  try {
    if (createAudioPlayer && FileSystem.cacheDirectory) {
      const tempUri = `${FileSystem.cacheDirectory}speech_reply_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(tempUri, cleanB64, {
        encoding: FileSystem.EncodingType?.Base64 || 'base64',
      });
      const player = createAudioPlayer(tempUri);
      activeNativeSound = player;
      player.play();
      return;
    }
  } catch (e) {
    console.log('expo-audio player fallback:', e);
  }

  // 3. expo-av legacy player
  if (AudioRuntime && FileSystem.cacheDirectory) {
    try {
      const outUri = `${FileSystem.cacheDirectory}speech_reply_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(outUri, cleanB64, { encoding: FileSystem.EncodingType.Base64 });
      const { sound } = await AudioRuntime.Sound.createAsync({ uri: outUri });
      activeNativeSound = sound;
      await sound.playAsync();
      return;
    } catch (e) {
      console.log('expo-av player fallback:', e);
    }
  }

  // 4. WebView HTML5 Audio bridge fallback (ensures audio works when native audio runtime is not available)
  if (webViewRef && webViewRef.current) {
    try {
      const jsCode = `
        (function() {
          try {
            var audio = new Audio("data:audio/wav;base64,${cleanB64}");
            audio.play();
          } catch(e) {}
        })();
        true;
      `;
      webViewRef.current.injectJavaScript(jsCode);
      return;
    } catch (e) {
      console.log('WebView audio playback notice:', e);
    }
  }
};
import { Colors } from '@/constants/theme';

const AnimatedPulseRing = ({ size, color, delay, active }: { size: number; color: string; delay: number; active: boolean }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      anim.setValue(0);
      return;
    }

    let loop: Animated.CompositeAnimation;
    const timeout = setTimeout(() => {
      anim.setValue(0);
      loop = Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );
      loop.start();
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (loop) loop.stop();
    };
  }, [active, anim, delay]);

  if (!active) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity: anim.interpolate({
          inputRange: [0, 0.6, 1],
          outputRange: [0.8, 0.2, 0],
        }),
        transform: [
          {
            scale: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.6],
            }),
          },
        ],
      }}
    />
  );
};


interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  time: string;
  places?: PlaceMention[];
  imageUri?: string;
  landmark?: LandmarkResponse;
  searchSnippets?: WebSearchSnippet[];
  timeFeasible?: boolean;
}

// LLM conversation history (separate from display messages — uses OpenAI roles)
type LLMHistory = Array<{ role: 'user' | 'assistant'; content: string }>;

export default function MeerupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prompt?: string }>();
  const initialPromptHandled = useRef<string | null>(null);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [aiState, setAiState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [llmHistory, setLlmHistory] = useState<LLMHistory>([]); // persists context across turns
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const webViewRef = useRef<any>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const audioRecorder = useAudioRecorder && RecordingPresets ? useAudioRecorder(RecordingPresets.HIGH_QUALITY) : null;

  const speakMessage = async (text: string, msgId: string) => {
    if (!text) return;
    try {
      setSpeakingMsgId(msgId);
      const ttsResponse = await synthesizeTextToSpeech(text, 'en', 'female');
      if (ttsResponse.audioBase64) {
        await playSpeechAudio(ttsResponse.audioBase64, webViewRef);
      }
    } catch (err) {
      console.warn('Speech playback error:', err);
    } finally {
      setTimeout(() => setSpeakingMsgId(null), 3000);
    }
  };

  // ─── Camera & Landmark AI ───────────────────────────────────────────
  const [cameraModalVisible, setCameraModalVisible] = useState(false);

  // ─── Recommendation Cards State ─────────────────────────────────────
  const [recommendationCards, setRecommendationCards] = useState<DestinationCard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [showCards, setShowCards] = useState(true);
  const [cardsFilterTitle, setCardsFilterTitle] = useState('');

  // ─── Onboarding / user context ───────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [userContext, setUserContext] = useState<UserContext>({
    interests: [],
    latitude: null,
    longitude: null,
    available_minutes: null,
  });
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const INTEREST_OPTIONS = [
    { label: 'Culture', icon: 'museum' },
    { label: 'Food', icon: 'restaurant' },
    { label: 'Nature', icon: 'park' },
    { label: 'History', icon: 'account-balance' },
    { label: 'Photography', icon: 'photo-camera' },
    { label: 'Festivals', icon: 'celebration' },
    { label: 'Shopping', icon: 'shopping-bag' },
    { label: 'Adventure', icon: 'terrain' },
  ];

  const TIME_OPTIONS = [
    { label: '30 min', value: 30 },
    { label: '1 hr', value: 60 },
    { label: '2 hrs', value: 120 },
    { label: '3 hrs', value: 180 },
    { label: 'Half day', value: 270 },
  ];

  const toggleInterest = (label: string) => {
    setUserContext(prev => ({
      ...prev,
      interests: prev.interests.includes(label)
        ? prev.interests.filter(i => i !== label)
        : [...prev.interests, label],
    }));
  };

  const requestLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserContext(prev => ({
          ...prev,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }));
        // Reverse geocode for display label
        const geo = await Location.reverseGeocodeAsync(loc.coords);
        if (geo[0]) {
          setLocationLabel(`${geo[0].district || geo[0].city || 'Your location'}, Manipur`);
        } else {
          setLocationLabel('Location detected');
        }
      } else {
        setLocationLabel('Permission denied');
      }
    } catch {
      setLocationLabel('Could not get location');
    }
    setLocLoading(false);
  };

  useEffect(() => {
    // Automatically detect real location if permissions exist
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserContext(prev => ({
            ...prev,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          }));
          const geo = await Location.reverseGeocodeAsync(loc.coords);
          if (geo[0]) {
            setLocationLabel(`${geo[0].district || geo[0].city || 'Your location'}, Manipur`);
          } else {
            setLocationLabel('Location detected');
          }
        }
      } catch (e) {
        // Silently fail if not yet permitted
      }
    })();
  }, []);

  const finishOnboarding = () => setShowOnboarding(false);

  const handleNewChat = () => {
    setMessages([]);
    setLlmHistory([]);
    setInputText('');
    setAiState('idle');
    setShowOnboarding(true);
  };

  // Latest conversation items for Voice Assistant display
  const latestAiMessage = useMemo(() => [...messages].reverse().find(m => m.role === 'ai'), [messages]);
  const latestUserMessage = useMemo(() => [...messages].reverse().find(m => m.role === 'user'), [messages]);

  const handleSendText = async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if (!text) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, time: now };
    setMessages(prev => [...prev, userMsg]);
    if (!overrideText) setInputText('');
    setAiState('thinking');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await askLLM(llmHistory, text, userContext);
      const reply = response.text;

      // Update LLM history for multi-turn context
      setLlmHistory(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: reply },
      ]);

      setAiState('speaking');
      const places = response.places && response.places.length > 0
        ? response.places
        : parsePlaceMentions(reply);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: reply,
        time: now,
        places,
        searchSnippets: response.searchSnippets,
        timeFeasible: response.timeFeasible,
      };
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

      // Play neural TTS audio in English for the reply
      try {
        const ttsResponse = await synthesizeTextToSpeech(reply, 'en', 'female');
        if (ttsResponse.audioBase64) {
          await playSpeechAudio(ttsResponse.audioBase64, webViewRef);
        }
      } catch (ttsErr) {
        console.warn('TTS playback error in handleSendText:', ttsErr);
      }

      // Refresh recommendation cards if places are mentioned
      if (places.length > 0) {
        const placeName = places[0].name;
        searchRecommendations(placeName, userContext.latitude || undefined, userContext.longitude || undefined)
          .then(cardRes => {
            if (cardRes.cards && cardRes.cards.length > 0) {
              setRecommendationCards(cardRes.cards);
              setShowCards(true);
              setCardsFilterTitle(`Featured: ${placeName}`);
            }
          })
          .catch(() => { });
      }
    } catch (err: any) {
      console.error('LLM error:', err);
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: "Sorry, I'm having trouble connecting right now. Please try again.",
        time: now,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setTimeout(() => setAiState('idle'), 1500);
    }
  };

  // ─── Initial Nearby Recommendation Cards Loading ─────────────────────
  useEffect(() => {
    const loadInitialCards = async () => {
      try {
        setIsLoadingCards(true);
        const lat = userContext.latitude || 24.8170;
        const lon = userContext.longitude || 93.9368;
        const res = await fetchNearbyRecommendations(lat, lon, 25.0, 4);
        if (res.cards && res.cards.length > 0) {
          setRecommendationCards(res.cards);
        }
      } catch (e) {
        console.warn('Could not load initial recommendation cards', e);
      } finally {
        setIsLoadingCards(false);
      }
    };
    loadInitialCards();
  }, [userContext.latitude, userContext.longitude]);

  useEffect(() => {
    if (params.prompt && initialPromptHandled.current !== params.prompt) {
      initialPromptHandled.current = params.prompt;
      setShowOnboarding(false);
      handleSendText(params.prompt);
    }
  }, [params.prompt]);

  // ─── Landmark Detection Handler ──────────────────────────────────────
  const handleLandmarkDetected = (result: LandmarkResponse, photoUri?: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: result.recognized
        ? `📸 Scanned ${result.name} with Landmark AI Camera`
        : '📸 Scanned photo with Landmark Camera',
      time: now,
      imageUri: photoUri,
    };

    const aiText = result.recognized
      ? `Visual match: ${result.name} (${Math.round(result.confidence * 100)}% match)!\n\n${result.story}`
      : "I could not identify this landmark with high confidence. Please ensure you are photographing Ima Keithel or Kangla Fort.";

    const matchingPlace = result.recognized ? parsePlaceMentions(result.name) : [];

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      text: aiText,
      time: now,
      places: matchingPlace,
      landmark: result.recognized ? result : undefined,
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);

    if (result.recognized) {
      searchRecommendations(result.name, userContext.latitude || undefined, userContext.longitude || undefined)
        .then(cardRes => {
          if (cardRes.cards && cardRes.cards.length > 0) {
            setRecommendationCards(cardRes.cards);
            setShowCards(true);
            setCardsFilterTitle(`Recommendations: ${result.name}`);
          }
        })
        .catch(() => { });
    }

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  };

  const [recording, setRecording] = useState<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAudioUnavailable = (msg?: string) => {
    setAiState('idle');
    setIsSpeaking(false);
    setAudioNotice(msg || 'Audio recording is not available. Please type your message below!');
    setTimeout(() => setAudioNotice(null), 4500);
  };

  const stopRecordingAndThink = async (rec: any) => {
    setAiState('thinking');
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }

    let uri = '';
    try {
      if (audioRecorder && audioRecorder.isRecording) {
        await audioRecorder.stop();
        uri = audioRecorder.uri;
      } else if (rec && typeof rec.stopAndUnloadAsync === 'function') {
        await rec.stopAndUnloadAsync();
        uri = rec.getURI();
      }
    } catch (e) {
      console.warn("Could not stop recording", e);
    }
    setRecording(null);
    setIsSpeaking(false);

    if (!uri) {
      handleAudioUnavailable('No voice audio was captured.');
      return;
    }

    try {
      // ─── Step 1: ASR Transcription in English via Whisper / IndicConformer ───
      const asrResponse = await transcribeAudio(uri, 'en');
      const userSpokenText = asrResponse.text?.trim() || asrResponse.originalText?.trim() || '';

      if (!userSpokenText) {
        setAiState('idle');
        return;
      }

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: userSpokenText,
        time: now,
      };
      setMessages(prev => [...prev, userMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

      // ─── Step 2: AI Conversational Reasoning via LLM ───
      const response = await askLLM(llmHistory, userSpokenText, userContext);
      const reply = response.text;

      // Update multi-turn history
      setLlmHistory(prev => [
        ...prev,
        { role: 'user', content: userSpokenText },
        { role: 'assistant', content: reply },
      ]);

      setAiState('speaking');
      const places = response.places && response.places.length > 0
        ? response.places
        : parsePlaceMentions(reply);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: reply,
        time: now,
        places,
        searchSnippets: response.searchSnippets,
        timeFeasible: response.timeFeasible,
      };
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

      // ─── Step 3: Text-to-Speech (Voice Output) in English via Neural TTS Model ───
      try {
        const ttsResponse = await synthesizeTextToSpeech(reply, 'en', 'female');

        if (ttsResponse.audioBase64) {
          await playSpeechAudio(ttsResponse.audioBase64, webViewRef);
        }
      } catch (ttsErr) {
        console.warn('TTS playback error:', ttsErr);
      }

      // Check recommendation cards for mentioned places
      if (places.length > 0) {
        const placeName = places[0].name;
        searchRecommendations(placeName, userContext.latitude || undefined, userContext.longitude || undefined)
          .then(cardRes => {
            if (cardRes.cards && cardRes.cards.length > 0) {
              setRecommendationCards(cardRes.cards);
              setShowCards(true);
              setCardsFilterTitle(`Featured: ${placeName}`);
            }
          })
          .catch(() => { });
      }
    } catch (err) {
      console.error('Voice chat pipeline error:', err);
    }

    setTimeout(() => setAiState('idle'), 3500);
  };

  const startRecording = async () => {
    // 1. Try modern expo-audio recorder
    if (audioRecorder) {
      try {
        if (requestRecordingPermissionsAsync) {
          const { granted } = await requestRecordingPermissionsAsync();
          if (!granted) {
            handleAudioUnavailable('Microphone permission was not granted.');
            return;
          }
        }
        if (setAudioModeAsync) {
          await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
          });
        }
        if (typeof audioRecorder.prepareToRecordAsync === 'function') {
          await audioRecorder.prepareToRecordAsync();
        }
        await audioRecorder.record();
        setRecording(audioRecorder);
        setAiState('listening');
        setIsSpeaking(true);
        return;
      } catch (e) {
        console.warn('expo-audio record fallback to expo-av:', e);
      }
    }

    // 2. Fallback to legacy expo-av
    if (AudioRuntime) {
      try {
        const permission = await AudioRuntime.requestPermissionsAsync();
        if (permission.status === 'granted') {
          await AudioRuntime.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });

          const options = {
            ...AudioRuntime.RecordingOptionsPresets.HIGH_QUALITY,
            isMeteringEnabled: true,
          };

          const { recording: newRecording } = await AudioRuntime.Recording.createAsync(
            options,
            (status: any) => {
              if (status.isRecording && 'isMeteringEnabled' in status) {
                const level = status.metering || -160;
                setIsSpeaking(level > -35);
              }
            },
            100
          );

          setRecording(newRecording);
          setAiState('listening');
          return;
        } else {
          handleAudioUnavailable('Microphone permission denied.');
          return;
        }
      } catch (err) {
        console.warn('Failed to start recording via expo-av:', err);
      }
    }

    // 3. Fallback when audio is not available
    handleAudioUnavailable('Microphone is not available in this environment. Type below or tap a prompt to hear MEERUP speak!');
  };

  const handleStopAll = async () => {
    await stopSpeechAudio(webViewRef);
    if (recording) {
      try {
        if (audioRecorder && audioRecorder.isRecording) {
          await audioRecorder.stop();
        } else if (typeof recording.stopAndUnloadAsync === 'function') {
          await recording.stopAndUnloadAsync();
        }
      } catch (e) {
        console.warn('Stop recording err:', e);
      }
      setRecording(null);
    }
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
    setAiState('idle');
    setIsSpeaking(false);
  };

  const toggleListening = async () => {
    if (aiState === 'idle') {
      await startRecording();
    } else if (aiState === 'listening') {
      if (recording) {
        await stopRecordingAndThink(recording);
      } else {
        setAiState('idle');
        setIsSpeaking(false);
      }
    } else if (aiState === 'speaking') {
      await handleStopAll();
    } else {
      await handleStopAll();
    }
  };

  const toggleMute = async () => {
    const willMute = !isMicMuted;
    setIsMicMuted(willMute);
    if (willMute && aiState === 'listening') {
      if (recording) {
        try { await recording.stopAndUnloadAsync(); } catch (e) { }
        setRecording(null);
      }
      if (silenceTimer.current) { clearTimeout(silenceTimer.current); silenceTimer.current = null; }
      setAiState('idle');
    } else if (!willMute && aiState === 'idle') {
      startRecording();
    }
  };

  useEffect(() => {
    return () => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };
  }, []);

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
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={90}
    >
      {/* Hidden audio webview for 100% audio playback fallback */}
      {Platform.OS !== 'web' && (
        <View style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: '<html><body></body></html>' }}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
          />
        </View>
      )}

      {/* ─── ONBOARDING OVERLAY ─────────────────────────────────────── */}
      {showOnboarding && (
        <View style={[StyleSheet.absoluteFill, styles.onboardingOverlay]}>
          <ScrollView
            contentContainerStyle={styles.onboardingScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Skip */}
            <TouchableOpacity style={styles.skipBtn} onPress={finishOnboarding}>
              <Text style={styles.skipText}>Skip</Text>
              <MaterialIcons name="arrow-forward" size={14} color="#9CA3AF" />
            </TouchableOpacity>

            <Text style={styles.onboardingTitle}>Personalise your{'\n'}MEERUP experience</Text>
            <Text style={styles.onboardingSubtitle}>
              Answer a few quick questions so I can give you the best recommendations.
            </Text>

            {/* Interests */}
            <Text style={styles.onboardingSectionLabel}>What are you into?</Text>
            <View style={styles.interestGrid}>
              {INTEREST_OPTIONS.map((opt) => {
                const selected = userContext.interests.includes(opt.label);
                return (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => toggleInterest(opt.label)}
                    style={[styles.interestChip, selected && styles.interestChipSelected]}
                  >
                    <MaterialIcons
                      name={opt.icon as any}
                      size={18}
                      color={selected ? '#fff' : '#4777c2'}
                    />
                    <Text style={[styles.interestChipText, selected && styles.interestChipTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Location */}
            <Text style={styles.onboardingSectionLabel}>Your location</Text>
            <TouchableOpacity
              style={[styles.locationBtn, userContext.latitude !== null && styles.locationBtnActive]}
              onPress={requestLocation}
              disabled={locLoading}
            >
              <MaterialIcons
                name={userContext.latitude !== null ? 'location-on' : 'my-location'}
                size={20}
                color={userContext.latitude !== null ? '#fff' : '#4777c2'}
              />
              <Text style={[styles.locationBtnText, userContext.latitude !== null && styles.locationBtnTextActive]}>
                {locLoading ? 'Detecting…' : locationLabel ?? 'Use My Location'}
              </Text>
            </TouchableOpacity>

            {/* Available time */}
            <Text style={styles.onboardingSectionLabel}>How much time do you have?</Text>
            <View style={styles.timeRow}>
              {TIME_OPTIONS.map((opt) => {
                const selected = userContext.available_minutes === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setUserContext(prev => ({ ...prev, available_minutes: opt.value }))}
                    style={[styles.timeChip, selected && styles.timeChipSelected]}
                  >
                    <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* CTA */}
            <TouchableOpacity style={styles.startBtn} onPress={finishOnboarding}>
              <Text style={styles.startBtnText}>Start Exploring</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
      {/* ──────────────────────────────────────────────────────────────── */}

      {!isVoiceMode && (
        <>
          {/* Subheader with Active Status & New Chat Button */}
          <View style={styles.chatTopBar}>
            <View style={styles.chatTopBarLeft}>
              <View style={styles.onlineDot} />
              <Text style={styles.chatTopBarTitle}>MEERUP Assistant</Text>
              {userContext.interests.length > 0 && (
                <View style={styles.contextBadge}>
                  <Text style={styles.contextBadgeText} numberOfLines={1}>
                    {userContext.interests.slice(0, 2).join(', ')}{userContext.interests.length > 2 ? ` +${userContext.interests.length - 2}` : ''}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={handleNewChat}
              accessibilityLabel="Start new chat"
              accessibilityRole="button"
            >
              <MaterialIcons name="add-comment" size={15} color="#4777c2" />
              <Text style={styles.newChatText}>New Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Audio Notice Banner when audio/recording is unavailable */}
          {audioNotice && (
            <View style={styles.audioNoticeBanner}>
              <MaterialIcons name="info-outline" size={16} color="#B45309" />
              <Text style={styles.audioNoticeText}>{audioNotice}</Text>
              <TouchableOpacity onPress={() => setAudioNotice(null)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={14} color="#B45309" />
              </TouchableOpacity>
            </View>
          )}

          <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.contentContainer}>


            {/* CHAT TRANSCRIPT */}
            <View style={styles.chatContainer}>
              {messages.length === 0 && (
                <View style={{ alignItems: 'center', paddingTop: 40, gap: 12 }}>
                  <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 }}>
                    Ask MEERUP anything about Manipur’s culture, food, and hidden gems.
                  </Text>
                  {[
                    { icon: 'menu-book', text: 'Tell me the legend of Kangla Sha', color: '#D97706' },
                    { icon: 'restaurant', text: 'Where can I find authentic Chak-hao?', color: '#047857' },
                    { icon: 'festival', text: 'What festivals are happening in Manipur?', color: '#4777c2' },
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip.text}
                      onPress={() => handleSendText(chip.text)}
                      style={styles.suggestionChip}
                    >
                      <MaterialIcons name={chip.icon as any} size={16} color={chip.color} />
                      <Text style={styles.suggestionChipText}>{chip.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {messages.map((msg) => {
                if (msg.role === 'user') {
                  return (
                    <View key={msg.id} style={styles.userMessageWrapper}>
                      {msg.imageUri && (
                        <Image source={{ uri: msg.imageUri }} style={styles.scannedImageThumb} />
                      )}
                      <View style={styles.userBubble}>
                        <Text style={styles.userMessageText}>{msg.text}</Text>
                      </View>
                      <View style={styles.messageFooter}>
                        <Text style={styles.timeText}>You · {msg.time}</Text>
                        <MaterialIcons name="done-all" size={13} color="#047857" style={{ marginLeft: 4 }} />
                      </View>
                    </View>
                  );
                } else {
                  return (
                    <View key={msg.id} style={styles.aiMessageWrapper}>
                      <View style={styles.aiHeader}>
                        <View style={styles.aiAvatar}>
                          <MaterialIcons name="arrow-back-ios" size={10} color="#4777c2" style={{ marginLeft: 2 }} />
                        </View>
                        <Text style={styles.aiName}>MEERUP Companion</Text>
                        <Text style={styles.timeText}>{msg.time}</Text>
                      </View>

                      <View style={styles.aiBubble}>
                        <Text style={styles.aiMessageText}>{msg.text}</Text>

                        {/* Speaker Button to listen to the AI speech */}
                        <View style={styles.bubbleActionRow}>
                          <TouchableOpacity
                            style={[
                              styles.listenBtn,
                              speakingMsgId === msg.id && styles.listenBtnActive,
                            ]}
                            onPress={() => speakMessage(msg.text, msg.id)}
                            accessibilityRole="button"
                            accessibilityLabel="Listen to this response"
                          >
                            <MaterialIcons
                              name={speakingMsgId === msg.id ? 'volume-up' : 'volume-down'}
                              size={15}
                              color={speakingMsgId === msg.id ? '#FFFFFF' : '#047857'}
                            />
                            <Text
                              style={[
                                styles.listenBtnText,
                                speakingMsgId === msg.id && { color: '#FFFFFF' },
                              ]}
                            >
                              {speakingMsgId === msg.id ? 'Playing...' : 'Listen'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* ── Verified Landmark AI Card ── */}
                        {msg.landmark && (
                          <View style={styles.landmarkCardBubble}>
                            <View style={styles.landmarkBadgeHeader}>
                              <MaterialIcons name="verified" size={16} color="#047857" />
                              <Text style={styles.landmarkBadgeText}>
                                Verified Landmark · {Math.round(msg.landmark.confidence * 100)}% Match
                              </Text>
                            </View>
                            {msg.landmark.highlights && msg.landmark.highlights.length > 0 && (
                              <View style={styles.landmarkHighlightsRow}>
                                {msg.landmark.highlights.map((h, i) => (
                                  <View key={i} style={styles.landmarkHighlightPill}>
                                    <Text style={styles.landmarkHighlightText}>{h}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                            {msg.landmark.facts && msg.landmark.facts.length > 0 && (
                              <View style={styles.landmarkFactsList}>
                                <Text style={styles.landmarkFactsTitle}>Key Facts</Text>
                                {msg.landmark.facts.slice(0, 3).map((f: string, i: number) => (
                                  <View key={i} style={styles.landmarkFactItem}>
                                    <MaterialIcons name="check-circle-outline" size={13} color="#047857" style={{ marginTop: 2 }} />
                                    <Text style={styles.landmarkFactText}>{f}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        )}

                        {/* ── Grounded Search Sources / Verification Note ── */}
                        {msg.searchSnippets && msg.searchSnippets.length > 0 && (
                          <View style={styles.groundedSourcesBubble}>
                            <View style={styles.groundedSourcesHeader}>
                              <MaterialIcons name="travel-explore" size={13} color={isDark ? '#60A5FA' : '#2563EB'} />
                              <Text style={styles.groundedSourcesHeaderText}>
                                Search + AI Grounded Fact Check
                              </Text>
                            </View>
                            {msg.searchSnippets.slice(0, 2).map((s, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={styles.snippetItem}
                                onPress={() => s.url && Linking.openURL(s.url).catch(() => {})}
                                accessibilityRole="link"
                              >
                                <Text style={styles.snippetTitle} numberOfLines={1}>
                                  • {s.title || 'Travel Guide Source'}
                                </Text>
                                <Text style={styles.snippetSnippet} numberOfLines={2}>
                                  {s.snippet}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {/* ── Clickable place chips with turn-by-turn directions ── */}
                        {msg.places && msg.places.length > 0 && (
                          <View style={styles.placesRow}>
                            <View style={styles.placesHeaderRow}>
                              <MaterialIcons name="navigation" size={13} color="#047857" />
                              <Text style={styles.placesLabel}>
                                {userContext.latitude !== null && userContext.longitude !== null
                                  ? 'Directions from your location'
                                  : 'Get Directions'}
                              </Text>
                            </View>
                            {msg.places.map(p => {
                              const hasLoc = userContext.latitude !== null && userContext.longitude !== null;
                              const distKm = hasLoc
                                ? getDistanceKm(userContext.latitude!, userContext.longitude!, p.lat, p.lng)
                                : null;
                              const distLabel = distKm !== null
                                ? distKm < 1
                                  ? `${Math.round(distKm * 1000)} m`
                                  : `${distKm.toFixed(1)} km`
                                : null;

                              return (
                                <TouchableOpacity
                                  key={p.name}
                                  style={styles.placeChip}
                                  onPress={() =>
                                    router.push({
                                      pathname: '/map',
                                      params: {
                                        destLat: p.lat.toString(),
                                        destLng: p.lng.toString(),
                                        destName: p.name,
                                      },
                                    })
                                  }
                                  accessibilityRole="button"
                                  accessibilityLabel={`Get directions to ${p.name}`}
                                >
                                  <MaterialIcons name="directions" size={14} color="#fff" />
                                  <Text style={styles.placeChipText}>{p.name}</Text>
                                  {distLabel && (
                                    <View style={styles.distanceBadge}>
                                      <Text style={styles.distanceBadgeText}>{distLabel}</Text>
                                    </View>
                                  )}
                                  <MaterialIcons name="arrow-forward" size={12} color="rgba(255,255,255,0.8)" />
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                }
              })}
              {/* Thinking indicator */}
              {aiState === 'thinking' && (
                <View style={styles.aiMessageWrapper}>
                  <View style={styles.aiHeader}>
                    <View style={styles.aiAvatar}>
                      <MaterialIcons name="arrow-back-ios" size={10} color="#4777c2" style={{ marginLeft: 2 }} />
                    </View>
                    <Text style={styles.aiName}>MEERUP Companion</Text>
                  </View>
                  <View style={[styles.aiBubble, { paddingVertical: 12 }]}>
                    <Text style={[styles.aiMessageText, { color: '#9CA3AF', fontStyle: 'italic' }]}>Thinking…</Text>
                  </View>
                </View>
              )}

              {/* ── Nearby & Live Scraped Recommendations ── */}
              {recommendationCards.length > 0 && (
                <View style={styles.recommendationsSection}>
                  <View style={styles.recommendationsHeaderRow}>
                    <View style={styles.recommendationsTitleRow}>
                      <MaterialIcons name="explore" size={18} color="#047857" />
                      <Text style={styles.recommendationsHeaderTitle}>
                        {cardsFilterTitle || 'Nearby Destinations & Live Buzz'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowCards(prev => !prev)}
                      style={styles.toggleCardsBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Toggle recommendation cards"
                    >
                      <Text style={styles.toggleCardsText}>{showCards ? 'Hide' : 'Show'}</Text>
                      <MaterialIcons
                        name={showCards ? 'expand-less' : 'expand-more'}
                        size={18}
                        color="#047857"
                      />
                    </TouchableOpacity>
                  </View>

                  {showCards && (
                    <View style={styles.cardsList}>
                      {recommendationCards.map((card) => (
                        <RecommendationCardItem key={card.id} card={card} />
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>


          </ScrollView>

          {/* BOTTOM INPUT */}
          <View style={[styles.bottomInputContainer, { paddingBottom: isKeyboardVisible ? 4 : Math.max(insets.bottom, 10) }]}>


            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setCameraModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Scan Landmark Camera"
              >
                <MaterialIcons name="photo-camera" size={20} color="#4B5563" />
              </TouchableOpacity>
              <View style={styles.textInputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Speak or ask MEERUP anything..."
                  placeholderTextColor="#9CA3AF"
                  value={inputText}
                  onChangeText={setInputText}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  onSubmitEditing={() => handleSendText()}
                  returnKeyType="send"
                  editable={aiState !== 'thinking'}
                />
              </View>

              {inputText.trim().length > 0 ? (
                <TouchableOpacity style={styles.sendBtn} onPress={() => handleSendText()}>
                  <MaterialIcons name="arrow-upward" size={20} color="#047857" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.sendBtn} onPress={() => {
                  setIsMicMuted(false);
                  setIsVoiceMode(true);
                }}>
                  <MaterialIcons name="mic" size={20} color="#4B5563" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </>
      )}

      {isVoiceMode && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0B0F19', zIndex: 999, justifyContent: 'space-between' }]}>
          {/* Header */}
          <View style={{ paddingTop: Math.max(insets.top, 20), paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity
              style={styles.voiceTopBtn}
              onPress={() => {
                handleStopAll();
                setIsVoiceMode(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="Close voice mode"
            >
              <MaterialIcons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: aiState === 'listening' ? '#3B82F6' : aiState === 'thinking' ? '#F59E0B' : aiState === 'speaking' ? '#10B981' : '#6B7280' }} />
              <Text style={{ color: '#E5E7EB', fontSize: 13, fontWeight: '600' }}>
                {aiState === 'listening' ? 'Listening...' : aiState === 'thinking' ? 'Thinking...' : aiState === 'speaking' ? 'Speaking...' : 'Ready · Click to Record'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.voiceTopBtn}
              onPress={() => {
                handleStopAll();
                setIsVoiceMode(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="Switch to text mode"
            >
              <MaterialIcons name="keyboard" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Live Text Readout of User Query and LLM Response */}
          <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: 'center' }}>
            <ScrollView
              style={{ maxHeight: 290 }}
              contentContainerStyle={{ paddingVertical: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {latestUserMessage && (
                <View style={styles.voiceUserBubble}>
                  <Text style={styles.voiceUserLabel}>You asked</Text>
                  <Text style={styles.voiceUserText}>{latestUserMessage.text}</Text>
                </View>
              )}

              {aiState === 'thinking' && (
                <View style={styles.voiceAiBubble}>
                  <Text style={styles.voiceAiLabel}>MEERUP Assistant</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <ActivityIndicator size="small" color="#F59E0B" />
                    <Text style={{ color: '#9CA3AF', fontSize: 14, fontStyle: 'italic' }}>
                      Thinking & generating guide...
                    </Text>
                  </View>
                </View>
              )}

              {latestAiMessage && aiState !== 'thinking' && (
                <View style={styles.voiceAiBubble}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={styles.voiceAiLabel}>MEERUP Assistant</Text>
                    {aiState === 'speaking' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialIcons name="volume-up" size={14} color="#10B981" />
                        <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>SPEAKING</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.voiceAiText}>{latestAiMessage.text}</Text>

                  {latestAiMessage.places && latestAiMessage.places.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {latestAiMessage.places.map(p => (
                        <View key={p.name} style={styles.voicePlaceChip}>
                          <MaterialIcons name="place" size={12} color="#34D399" />
                          <Text style={styles.voicePlaceChipText}>{p.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {!latestUserMessage && !latestAiMessage && aiState === 'idle' && (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <MaterialIcons name="mic-none" size={44} color="#4B5563" style={{ marginBottom: 12 }} />
                  <Text style={{ color: '#E5E7EB', fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 6 }}>
                    English Voice Assistant
                  </Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 280 }}>
                    Click "Record" below when you want to speak. Responses will be spoken aloud and shown in text here.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Center Orb & Action Controls */}
          <View style={{ alignItems: 'center', paddingBottom: Math.max(insets.bottom, 20) + 12 }}>
            <View style={[styles.orbContainer, { marginBottom: 16 }]}>
              <AnimatedPulseRing size={112} color={aiState === 'speaking' ? '#10B981' : '#4777c2'} delay={0} active={aiState === 'listening' || aiState === 'speaking'} />
              <AnimatedPulseRing size={112} color={aiState === 'speaking' ? '#10B981' : '#4777c2'} delay={600} active={aiState === 'listening' || aiState === 'speaking'} />
              <TouchableOpacity
                onPress={toggleListening}
                style={[
                  styles.orbOuter,
                  aiState === 'idle' && { borderColor: '#E5E7EB', opacity: 0.6 },
                  aiState === 'listening' && { borderColor: '#3B82F6' },
                  aiState === 'thinking' && { borderColor: '#D97706' },
                  aiState === 'speaking' && { borderColor: '#10B981' },
                ]}
              >
                <View style={[
                  styles.orbInner,
                  aiState === 'idle' && { borderColor: '#4B5563', backgroundColor: '#111827' },
                  aiState === 'listening' && { borderColor: '#3B82F6', backgroundColor: '#1E3A8A' },
                  aiState === 'thinking' && { borderColor: '#D97706', backgroundColor: '#78350F' },
                  aiState === 'speaking' && { borderColor: '#10B981', backgroundColor: '#064E3B' },
                ]}>
                  <MaterialIcons
                    name={
                      aiState === 'listening' ? 'stop' :
                      aiState === 'speaking' ? 'stop' :
                      aiState === 'thinking' ? 'hourglass-empty' :
                      'mic'
                    }
                    size={28}
                    color={
                      aiState === 'listening' ? '#93C5FD' :
                      aiState === 'thinking' ? '#FCD34D' :
                      aiState === 'speaking' ? '#6EE7B7' :
                      '#FFFFFF'
                    }
                    style={{ marginBottom: 2 }}
                  />
                  <Text style={[
                    styles.orbText,
                    { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }
                  ]}>
                    {aiState === 'listening' ? 'Stop' : aiState === 'speaking' ? 'Stop' : aiState === 'thinking' ? 'Thinking' : 'Record'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Prominent Action Controls: Stop Button / Record Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {aiState === 'listening' && (
                <TouchableOpacity
                  style={styles.voiceStopBtn}
                  onPress={() => {
                    if (recording) stopRecordingAndThink(recording);
                    else handleStopAll();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Stop recording and get answer"
                >
                  <MaterialIcons name="stop-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.voiceStopBtnText}>Stop & Get Answer</Text>
                </TouchableOpacity>
              )}

              {aiState === 'speaking' && (
                <TouchableOpacity
                  style={styles.voiceStopBtn}
                  onPress={handleStopAll}
                  accessibilityRole="button"
                  accessibilityLabel="Stop voice playback"
                >
                  <MaterialIcons name="stop-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.voiceStopBtnText}>Stop Voice</Text>
                </TouchableOpacity>
              )}

              {aiState === 'thinking' && (
                <TouchableOpacity
                  style={[styles.voiceStopBtn, { backgroundColor: '#4B5563' }]}
                  onPress={handleStopAll}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel thinking"
                >
                  <MaterialIcons name="close" size={20} color="#FFFFFF" />
                  <Text style={styles.voiceStopBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}

              {aiState === 'idle' && (
                <TouchableOpacity
                  style={styles.voiceRecordBtn}
                  onPress={startRecording}
                  accessibilityRole="button"
                  accessibilityLabel="Click to record voice"
                >
                  <MaterialIcons name="mic" size={22} color="#FFFFFF" />
                  <Text style={styles.voiceRecordBtnText}>Click to Record</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* LANDMARK AR CAMERA MODAL */}
      <LandmarkCameraModal
        visible={cameraModalVisible}
        onClose={() => setCameraModalVisible(false)}
        onLandmarkDetected={handleLandmarkDetected}
        onSpeechInteraction={(landmark) => {
          handleLandmarkDetected(landmark);
          setCameraModalVisible(false);
          setIsMicMuted(false);
          setIsVoiceMode(true);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  // HEADER
  header: {
    backgroundColor: colors.background,
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
    color: colors.text,
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
    color: colors.textSecondary,
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
    borderColor: colors.border,
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
    backgroundColor: colors.backgroundElement,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
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
    backgroundColor: colors.backgroundElement,
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
    backgroundColor: colors.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // CHAT
  chatTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: isDark ? colors.backgroundElement : '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatTopBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  chatTopBarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.2,
  },
  contextBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: isDark ? '#1E293B' : '#E0E7FF',
    maxWidth: 140,
  },
  contextBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4777c2',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: isDark ? colors.backgroundSelected : '#EEF2F6',
    borderWidth: 1,
    borderColor: colors.border,
  },
  newChatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4777c2',
  },
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
    backgroundColor: isDark ? colors.backgroundSelected : '#EEF2F6',
    borderRadius: 16,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userMessageText: {
    fontSize: 14,
    color: colors.text,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.backgroundElement,
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
    backgroundColor: colors.backgroundElement,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    gap: 16,
  },
  aiMessageText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
  },
  placesRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  placesHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  placesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#047857',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  placeChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  distanceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  distanceBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // CARDS
  card: {
    padding: 12,
    backgroundColor: colors.backgroundElement,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: isDark ? colors.backgroundSelected : '#F3F4F6',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardImageContainerSmall: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: isDark ? colors.backgroundSelected : '#F3F4F6',
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.backgroundElement,
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
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.backgroundElement,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
  },
  secondaryBtnText: {
    color: colors.text,
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
    color: colors.textSecondary,
    marginTop: 4,
  },

  // BOTTOM INPUT
  bottomInputContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
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
    color: colors.textSecondary,
    fontWeight: '600',
  },
  engineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engineText: {
    fontSize: 11,
    color: colors.textSecondary,
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
    backgroundColor: isDark ? colors.backgroundSelected : '#F3F4F6',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputWrapper: {
    flex: 1,
    height: 40,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
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
    backgroundColor: isDark ? colors.backgroundSelected : '#F3F4F6',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.backgroundElement,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    width: '100%',
  },
  suggestionChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    flexShrink: 1,
  },

  // ONBOARDING
  onboardingOverlay: {
    backgroundColor: isDark ? '#0A0F1E' : '#F0F4FF',
    zIndex: 999,
  },
  onboardingScroll: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginBottom: 32,
  },
  skipText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  onboardingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 36,
    marginBottom: 10,
  },
  onboardingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 32,
  },
  onboardingSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4777c2',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#4777c2',
    backgroundColor: 'transparent',
  },
  interestChipSelected: {
    backgroundColor: '#4777c2',
    borderColor: '#4777c2',
  },
  interestChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4777c2',
  },
  interestChipTextSelected: {
    color: '#fff',
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#4777c2',
    backgroundColor: 'transparent',
    marginBottom: 28,
  },
  locationBtnActive: {
    backgroundColor: '#4777c2',
    borderColor: '#4777c2',
  },
  locationBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4777c2',
  },
  locationBtnTextActive: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 36,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  timeChipSelected: {
    backgroundColor: '#4777c2',
    borderColor: '#4777c2',
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeChipTextSelected: {
    color: '#fff',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#4777c2',
    elevation: 4,
    shadowColor: '#4777c2',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // ── Scanned Image & Landmark AI Bubble ──
  scannedImageThumb: {
    width: 200,
    height: 130,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  landmarkCardBubble: {
    backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: isDark ? '#047857' : '#A7F3D0',
  },
  landmarkBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  landmarkBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#6EE7B7' : '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  landmarkHighlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  landmarkHighlightPill: {
    backgroundColor: isDark ? '#047857' : '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  landmarkHighlightText: {
    fontSize: 11,
    color: isDark ? '#ECFDF5' : '#065F46',
    fontWeight: '500',
  },
  landmarkFactsList: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#047857' : '#A7F3D0',
    paddingTop: 8,
  },
  landmarkFactsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#A7F3D0' : '#047857',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  landmarkFactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  landmarkFactText: {
    fontSize: 12,
    color: isDark ? '#E5E7EB' : '#1F2937',
    flex: 1,
    lineHeight: 16,
  },

  // ── Search + AI Grounded Sources Bubble ──
  groundedSourcesBubble: {
    backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: isDark ? '#3B82F6' : '#BFDBFE',
  },
  groundedSourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  groundedSourcesHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#93C5FD' : '#1D4ED8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  snippetItem: {
    marginTop: 4,
    paddingVertical: 2,
  },
  snippetTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#E2E8F0' : '#1E3A8A',
  },
  snippetSnippet: {
    fontSize: 11,
    color: isDark ? '#94A3B8' : '#4B5563',
    lineHeight: 15,
    marginTop: 1,
  },

  // ── Recommendations Section ──
  recommendationsSection: {
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  recommendationsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recommendationsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recommendationsHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  toggleCardsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
  },
  toggleCardsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  cardsList: {
    gap: 12,
  },
  audioNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  audioNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  bubbleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: isDark ? 'rgba(4, 120, 87, 0.25)' : '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(4, 120, 87, 0.4)' : '#A7F3D0',
    alignSelf: 'flex-start',
  },
  listenBtnActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  listenBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  voiceTopBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  voiceUserBubble: {
    backgroundColor: 'rgba(31, 41, 55, 0.7)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  voiceUserLabel: {
    fontSize: 11,
    color: '#93C5FD',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  voiceUserText: {
    fontSize: 14,
    color: '#F3F4F6',
    lineHeight: 20,
  },
  voiceAiBubble: {
    backgroundColor: 'rgba(17, 24, 39, 0.88)',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  voiceAiLabel: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  voiceAiText: {
    fontSize: 15,
    color: '#F9FAFB',
    lineHeight: 22,
  },
  voicePlaceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(6, 78, 59, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
  },
  voicePlaceChipText: {
    fontSize: 11,
    color: '#A7F3D0',
    fontWeight: '600',
  },
  voiceStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 28,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  voiceStopBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  voiceRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#047857',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 28,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  voiceRecordBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
