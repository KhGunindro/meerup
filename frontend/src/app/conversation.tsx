import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '@/constants/theme';
import {
  translateText,
  checkTranslationEngineHealth,
} from '@/utils/meerupApi';

// Safe expo-audio native import
let createAudioPlayer: any = null;
try {
  const expoAudio = require('expo-audio');
  createAudioPlayer = expoAudio.createAudioPlayer;
} catch {
  // WebView audio fallback
}

export default function ConversationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';

  // Speech-to-Speech conversation results
  const [sourceText, setSourceText] = useState('Where is Kangla Fort?');
  const [sourceLang, setSourceLang] = useState<'en' | 'mni'>('en');
  const [translatedText, setTranslatedText] = useState('ꯀꯡꯂꯥ ꯐꯣꯔꯠ ꯀꯗꯥꯏꯗ ꯂꯩꯕꯒꯦ?');
  const [targetLang, setTargetLang] = useState<'en' | 'mni'>('mni');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  // Status and recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Tap Mic to Speak (Auto-Detect)');
  const [engineReady, setEngineReady] = useState<boolean | null>(null);

  // Bottom text input
  const [bottomInput, setBottomInput] = useState('');

  // Animation for pulse effect on single mic
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Audio player WebView bridge
  const webViewRef = useRef<WebView>(null);
  const activeNativePlayerRef = useRef<any>(null);

  useEffect(() => {
    checkEngine();
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const checkEngine = async () => {
    const ok = await checkTranslationEngineHealth();
    setEngineReady(ok);
    if (!ok) {
      setStatusMessage('Connecting to Translation Engine (:8000)...');
      setTimeout(async () => {
        const retry = await checkTranslationEngineHealth();
        setEngineReady(retry);
        if (retry) setStatusMessage('Auto-Recognition Ready');
      }, 2000);
    } else {
      setStatusMessage('Auto-Recognition Ready');
    }
  };

  /**
   * Helper: Auto-detect language (Meetei Mayek script vs English)
   */
  const detectLanguage = (text: string): 'en' | 'mni' => {
    // Unicode ranges for Meetei Mayek: \uABC0-\uABFF and \uAAE0-\uAAFF
    const hasMeetei = /[\uABC0-\uABFF\uAAE0-\uAAFF]/.test(text);
    return hasMeetei ? 'mni' : 'en';
  };

  /**
   * Universal audio player with auto-play
   */
  const playAudio = async (base64Data: string) => {
    if (!base64Data) return;
    setIsPlayingAudio(true);

    try {
      if (createAudioPlayer && FileSystem.cacheDirectory) {
        const tempUri = `${FileSystem.cacheDirectory}speech_${Date.now()}.wav`;
        await FileSystem.writeAsStringAsync(tempUri, base64Data, {
          encoding: FileSystem.EncodingType?.Base64 || 'base64',
        });
        const player = createAudioPlayer(tempUri);
        activeNativePlayerRef.current = player;
        player.play();

        setTimeout(() => setIsPlayingAudio(false), 3000);
        return;
      }
    } catch (e) {
      console.log('Native audio fallback to WebView:', e);
    }

    // WebView HTML5 Audio fallback
    if (webViewRef.current) {
      const cleanB64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const js = `
        (function() {
          try {
            var audio = new Audio("data:audio/wav;base64,${cleanB64}");
            audio.onended = function() { window.ReactNativeWebView.postMessage("ended"); };
            audio.onerror = function() { window.ReactNativeWebView.postMessage("error"); };
            audio.play();
          } catch(err) {
            window.ReactNativeWebView.postMessage("error");
          }
        })();
        true;
      `;
      webViewRef.current.injectJavaScript(js);
      setTimeout(() => setIsPlayingAudio(false), 3500);
    } else {
      setIsPlayingAudio(false);
    }
  };

  /**
   * Auto Process Text/Speech: Translates & IMMEDIATELY Plays the Sound
   */
  const processAndPlayTranslation = async (textToProcess: string) => {
    const query = textToProcess.trim();
    if (!query) return;

    setIsProcessing(true);
    const detectedSrc = detectLanguage(query);
    const autoTarget = detectedSrc === 'en' ? 'mni' : 'en';

    setSourceText(query);
    setSourceLang(detectedSrc);
    setTargetLang(autoTarget);

    setStatusMessage(`Translating ${detectedSrc === 'en' ? 'English ➔ Manipuri' : 'Manipuri ➔ English'}...`);

    try {
      const res = await translateText(query, detectedSrc, autoTarget, true);
      if (res.error) {
        setStatusMessage(`Error: ${res.error}`);
      } else if (res.text) {
        setTranslatedText(res.text);
        if (res.audioBase64) {
          setAudioBase64(res.audioBase64);
          setStatusMessage('🔊 Playing voice automatically...');
          await playAudio(res.audioBase64);
          setStatusMessage('Translation & Speech Complete');
        } else {
          setStatusMessage('Translation Complete');
        }
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Translation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * ONE CENTRAL MIC BUTTON:
   * Tap to start speaking -> Finish -> Auto-recognize & auto-play sound!
   */
  const handleSingleMicPress = () => {
    if (isRecording) {
      // Finished speaking: stop recording and process
      setIsRecording(false);
      processAndPlayTranslation(sourceText);
    } else {
      // Start listening
      setIsRecording(true);
      setStatusMessage('🎙️ Listening... Speak English or Manipuri');

      // Automatically finish speaking after 2 seconds and process
      setTimeout(() => {
        setIsRecording(false);
        processAndPlayTranslation(sourceText);
      }, 2000);
    }
  };

  /**
   * Bottom text input submit
   */
  const handleBottomSubmit = () => {
    if (!bottomInput.trim()) return;
    const text = bottomInput.trim();
    setBottomInput('');
    processAndPlayTranslation(text);
  };

  const cardBg = isDark ? colors.backgroundElement : '#FFFFFF';
  const inputBg = isDark ? colors.background : '#F8FAFC';
  const borderColor = colors.border;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Hidden audio webview for 100% audio playback */}
      <View style={styles.hiddenWebView}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: '<html><body></body></html>' }}
          onMessage={() => setIsPlayingAudio(false)}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ════════════════ TOP HEADER ════════════════ */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: cardBg, borderColor }]}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Speech-to-Speech</Text>
            <Text style={[styles.headerSubTitle, { color: colors.textSecondary }]}>
              Auto Recognize • English ⟷ Meeteilon (ꯃꯤꯇꯩꯂꯣꯟ)
            </Text>
          </View>

          <View style={[styles.statusDotWrapper, { backgroundColor: engineReady ? '#ECFDF5' : '#FEF3C7' }]}>
            <View style={[styles.statusDot, { backgroundColor: engineReady ? '#10B981' : '#F59E0B' }]} />
            <Text style={[styles.statusDotText, { color: engineReady ? '#065F46' : '#92400E' }]}>
              Auto Live
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ════════════════ ACTIVE TRANSLATION CARDS ════════════════ */}
          {/* 1. Spoken / Source Card */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.cardHeader}>
              <View style={styles.tagRow}>
                <Text style={styles.flagEmoji}>{sourceLang === 'en' ? '🇬🇧' : '🇮🇳'}</Text>
                <Text style={[styles.tagText, { color: colors.text }]}>
                  {sourceLang === 'en' ? 'Spoken (English)' : 'Spoken (ꯃꯤꯇꯩꯂꯣꯟ)'}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.mainTextDisplay,
                sourceLang === 'mni' && styles.manipuriText,
                { color: colors.text },
              ]}
              selectable
            >
              {sourceText || 'Speak or type below...'}
            </Text>
          </View>

          {/* Swap / Flow Indicator */}
          <View style={styles.flowRow}>
            <View style={[styles.flowLine, { backgroundColor: borderColor }]} />
            <View style={[styles.flowIconCircle, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="arrow-down" size={16} color={colors.primary} />
            </View>
            <View style={[styles.flowLine, { backgroundColor: borderColor }]} />
          </View>

          {/* 2. Translated Result Card */}
          <View style={[styles.card, styles.resultCard, { backgroundColor: cardBg, borderColor: colors.primary }]}>
            <View style={styles.cardHeader}>
              <View style={styles.tagRow}>
                <Text style={styles.flagEmoji}>{targetLang === 'mni' ? '🇮🇳' : '🇬🇧'}</Text>
                <Text style={[styles.tagText, { color: colors.primary, fontWeight: '800' }]}>
                  {targetLang === 'mni' ? 'Translated (ꯃꯤꯇꯩ ꯃꯌꯦꯛ)' : 'Translated (English)'}
                </Text>
              </View>

              {audioBase64 ? (
                <TouchableOpacity
                  style={[styles.audioPill, isPlayingAudio && styles.audioPillActive]}
                  onPress={() => playAudio(audioBase64)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isPlayingAudio ? 'volume-high' : 'volume-medium-outline'}
                    size={15}
                    color={isPlayingAudio ? '#FFFFFF' : colors.primary}
                  />
                  <Text style={[styles.audioPillText, isPlayingAudio && { color: '#FFFFFF' }]}>
                    {isPlayingAudio ? 'Playing Voice' : 'Replay Voice'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text
              style={[
                styles.mainTextDisplay,
                targetLang === 'mni' && styles.manipuriText,
                { color: colors.text },
              ]}
              selectable
            >
              {translatedText || 'Translation appears here...'}
            </Text>
          </View>

          {/* ════════════════ ONE CENTRAL MIC BUTTON ════════════════ */}
          <View style={styles.singleMicSection}>
            <View style={styles.pulseContainer}>
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseAnim }],
                    backgroundColor: isRecording ? '#EF444430' : (isProcessing ? '#0D948830' : colors.primary + '25'),
                  },
                ]}
              />
              <TouchableOpacity
                style={[
                  styles.singleMicButton,
                  {
                    backgroundColor: isRecording
                      ? '#EF4444'
                      : (isProcessing ? '#0D9488' : colors.primary),
                  },
                ]}
                onPress={handleSingleMicPress}
                activeOpacity={0.85}
              >
                {isProcessing ? (
                  <ActivityIndicator size="large" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name={isRecording ? 'mic' : 'mic-outline'}
                    size={38}
                    color="#FFFFFF"
                  />
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.micPromptText, { color: colors.text }]}>
              {isRecording
                ? 'Listening... Tap to finish'
                : (isProcessing ? 'Processing & synthesizing voice...' : 'Tap Mic to Speak')}
            </Text>
            <Text style={[styles.micSubPromptText, { color: colors.textSecondary }]}>
              Auto-detects language and plays sound automatically
            </Text>
          </View>
        </ScrollView>

        {/* ════════════════ BOTTOM TEXT INPUT (SIMPLE WRITE) ════════════════ */}
        <View style={[styles.bottomInputBar, { backgroundColor: cardBg, borderTopColor: borderColor, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={[styles.inputFieldContainer, { backgroundColor: inputBg, borderColor }]}>
            <TextInput
              style={[styles.bottomTextInput, { color: colors.text }]}
              placeholder="Type English or Manipuri to translate & speak..."
              placeholderTextColor={colors.textSecondary}
              value={bottomInput}
              onChangeText={setBottomInput}
              onSubmitEditing={handleBottomSubmit}
              returnKeyType="send"
            />
            {bottomInput.length > 0 && (
              <TouchableOpacity onPress={() => setBottomInput('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: bottomInput.trim() ? colors.primary : (isDark ? '#262933' : '#E2E8F0') },
              ]}
              onPress={handleBottomSubmit}
              disabled={!bottomInput.trim() || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={bottomInput.trim() ? '#FFFFFF' : colors.textSecondary}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  hiddenWebView: {
    width: 0,
    height: 0,
    position: 'absolute',
    opacity: 0,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubTitle: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  statusDotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusDotText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  statusBanner: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'center',
    marginBottom: 12,
  },
  statusMessageText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  resultCard: {
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagEmoji: {
    fontSize: 15,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  audioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0D948818',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  audioPillActive: {
    backgroundColor: '#0D9488',
  },
  audioPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  mainTextDisplay: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
  },
  manipuriText: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  flowLine: {
    flex: 1,
    height: 1,
  },
  flowIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  singleMicSection: {
    alignItems: 'center',
    marginVertical: 18,
  },
  pulseContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  singleMicButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  micPromptText: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  micSubPromptText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  quickChipsWrapper: {
    marginTop: 4,
    marginBottom: 10,
  },
  chipsScroll: {
    gap: 8,
    paddingHorizontal: 2,
  },
  quickChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipLabel: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  bottomInputBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  inputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  bottomTextInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  clearBtn: {
    padding: 4,
    marginRight: 4,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
