import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
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
  speechToSpeech,
  checkTranslationEngineHealth,
} from '@/utils/meerupApi';

// Safe expo-audio imports
let createAudioPlayer: any = null;
let useAudioRecorder: any = null;
let RecordingPresets: any = null;
let requestRecordingPermissionsAsync: any = null;
let setAudioModeAsync: any = null;

try {
  const expoAudio = require('expo-audio');
  createAudioPlayer = expoAudio.createAudioPlayer;
  useAudioRecorder = expoAudio.useAudioRecorder;
  RecordingPresets = expoAudio.RecordingPresets;
  requestRecordingPermissionsAsync = expoAudio.requestRecordingPermissionsAsync;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
} catch (e) {
  console.log('expo-audio native module notice:', e);
}

export default function ConversationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';

  // Mode: 'auto' (Whisper LID Layer) | 'en' (English -> Manipuri) | 'mni' (Manipuri -> English)
  const [speechMode, setSpeechMode] = useState<'auto' | 'en' | 'mni'>('auto');

  // Live spoken & translated text (strictly empty initial state - no predefined text)
  const [spokenText, setSpokenText] = useState('');
  const [spokenLang, setSpokenLang] = useState<'en' | 'mni'>('en');
  const [translatedText, setTranslatedText] = useState('');
  const [targetLang, setTargetLang] = useState<'en' | 'mni'>('mni');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  // States
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Tap Mic to Speak');

  // Bottom text input
  const [bottomInput, setBottomInput] = useState('');

  // Animation for pulse effect on mic
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Audio player WebView bridge
  const webViewRef = useRef<WebView>(null);
  const activeNativePlayerRef = useRef<any>(null);

  // Native audio recorder instance (if available)
  const recorder = useAudioRecorder && RecordingPresets ? useAudioRecorder(RecordingPresets.HIGH_QUALITY) : null;

  useEffect(() => {
    checkTranslationEngineHealth();
    if (setAudioModeAsync) {
      setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      }).catch((e: any) => console.log('Audio mode init:', e));
    }
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  /**
   * Auto-detect text script (Meetei Mayek script vs Latin/English)
   */
  const detectLanguage = (text: string): 'en' | 'mni' => {
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
   * Clear current translation state
   */
  const handleClear = () => {
    setSpokenText('');
    setTranslatedText('');
    setAudioBase64(null);
    setStatusMessage('Tap Mic to Speak');
  };

  /**
   * Auto-translate typed input:
   * English -> Manipuri (and speaks Manipuri voice)
   * Manipuri -> English (and speaks English voice)
   */
  const processAndTranslateText = async (inputText: string) => {
    const query = inputText.trim();
    if (!query) return;

    setIsProcessing(true);
    const detectedSrc = speechMode === 'auto' ? detectLanguage(query) : speechMode;
    const target = detectedSrc === 'en' ? 'mni' : 'en';

    setSpokenText(query);
    setSpokenLang(detectedSrc);
    setTargetLang(target);
    setStatusMessage(detectedSrc === 'en' ? 'Translating to Manipuri...' : 'Translating to English...');

    try {
      const res = await translateText(query, detectedSrc, target, true);
      if (res.text && res.text.trim()) {
        setTranslatedText(res.text);
        if (res.audioBase64) {
          setAudioBase64(res.audioBase64);
          setStatusMessage('Speaking...');
          await playAudio(res.audioBase64);
        }
        setStatusMessage('Tap Mic to Speak');
      } else {
        setStatusMessage('Translation returned empty');
      }
    } catch (err: any) {
      setStatusMessage('Translation error');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Live Speech-to-Speech Microphone Handler
   * Records live microphone audio and translates speech in real-time.
   */
  const handleMicPress = async () => {
    if (isRecording) {
      // User finished speaking: stop recorder and translate
      setIsRecording(false);
      setIsProcessing(true);
      setStatusMessage('Recognizing language & translating...');

      try {
        if (recorder) {
          await recorder.stop();
          const uri = recorder.uri;

          if (uri) {
            const reqSrc = speechMode;
            const reqTgt = speechMode === 'en' ? 'mni' : (speechMode === 'mni' ? 'en' : 'mni');

            const res = await speechToSpeech(uri, reqSrc, reqTgt);

            if (res.text && res.text.trim()) {
              const recognized = res.originalText || '';
              const translated = res.text;
              const sLang = (res.sourceLanguage === 'mni' ? 'mni' : 'en') as 'en' | 'mni';
              const tLang = (res.targetLanguage === 'en' ? 'en' : 'mni') as 'en' | 'mni';

              setSpokenText(recognized);
              setSpokenLang(sLang);
              setTranslatedText(translated);
              setTargetLang(tLang);

              if (res.audioBase64) {
                setAudioBase64(res.audioBase64);
                setStatusMessage('Speaking...');
                await playAudio(res.audioBase64);
              }
              setStatusMessage('Tap Mic to Speak');
            } else {
              setStatusMessage('No speech detected. Please speak clearly into the mic or type below.');
              setTimeout(() => {
                setStatusMessage('Tap Mic to Speak');
              }, 4000);
            }
          } else {
            setStatusMessage('No audio captured');
          }
        } else {
          setStatusMessage('Microphone recorder not ready');
        }
      } catch (err: any) {
        console.log('STS processing error:', err);
        setStatusMessage('Speech recognition error');
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Start live recording
      try {
        if (requestRecordingPermissionsAsync) {
          const { granted } = await requestRecordingPermissionsAsync();
          if (!granted) {
            setStatusMessage('Microphone permission required');
            return;
          }
        }

        if (setAudioModeAsync) {
          await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
          });
        }

        if (recorder) {
          await recorder.prepareToRecordAsync();
          recorder.record();
        }

        setIsRecording(true);
        setStatusMessage('Listening... Tap when finished');
      } catch (err: any) {
        console.log('Failed to start recording:', err);
        setIsRecording(true);
        setStatusMessage('Listening... Tap when finished');
      }
    }
  };

  /**
   * Bottom text input submit
   */
  const handleBottomSubmit = () => {
    if (!bottomInput.trim()) return;
    const text = bottomInput.trim();
    setBottomInput('');
    processAndTranslateText(text);
  };

  const cardBg = isDark ? colors.backgroundElement : '#FFFFFF';
  const inputBg = isDark ? colors.background : '#F8FAFC';
  const borderColor = colors.border;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Hidden audio webview for 100% audio playback fallback */}
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
                router.replace('/');
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
              English ⟷ Manipuri (ꯃꯤꯇꯩꯂꯣꯟ)
            </Text>
          </View>
        </View>

        {/* ════════════════ LANGUAGE MODE SELECTOR ════════════════ */}
        <View style={styles.modeSelectorWrap}>
          {[
            { id: 'auto', label: 'Auto Detect' },
            { id: 'en', label: 'English → Manipuri' },
            { id: 'mni', label: 'Manipuri → English' },
          ].map((item) => {
            const isSelected = speechMode === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.modePill,
                  {
                    backgroundColor: isSelected ? colors.primary : (isDark ? '#1E293B' : '#F1F5F9'),
                    borderColor: isSelected ? colors.primary : borderColor,
                  },
                ]}
                onPress={() => setSpeechMode(item.id as any)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modePillText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ════════════════ MAIN CENTER STAGE ════════════════ */}
        <View style={styles.centerStage}>
          {/* Live Translation Text Result (Shows ONLY what was actively spoken or typed) */}
          {translatedText ? (
            <View style={styles.resultContainer}>
              {spokenText ? (
                <Text style={[styles.spokenSubtext, { color: colors.textSecondary }]}>
                  {spokenLang === 'en' ? 'Spoke English: ' : 'Spoke Manipuri: '}
                  {spokenText}
                </Text>
              ) : null}

              <Text
                style={[
                  styles.translatedMainText,
                  targetLang === 'mni' && styles.manipuriText,
                  { color: colors.text },
                ]}
                selectable
              >
                {translatedText}
              </Text>

              <View style={styles.actionRow}>
                {audioBase64 ? (
                  <TouchableOpacity
                    style={[styles.replayBtn, isPlayingAudio && styles.replayBtnActive]}
                    onPress={() => playAudio(audioBase64)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isPlayingAudio ? 'volume-high' : 'volume-medium-outline'}
                      size={18}
                      color={isPlayingAudio ? '#FFFFFF' : colors.primary}
                    />
                    <Text style={[styles.replayBtnText, isPlayingAudio && { color: '#FFFFFF' }]}>
                      {isPlayingAudio ? 'Playing' : 'Replay Voice'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.clearActionBtn, { borderColor }]}
                  onPress={handleClear}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.clearActionText, { color: colors.textSecondary }]}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyPromptContainer}>
              <Text style={[styles.emptyPromptTitle, { color: colors.text }]}>
                Tap Mic & Speak
              </Text>
              <Text style={[styles.emptyPromptSub, { color: colors.textSecondary }]}>
                {speechMode === 'auto'
                  ? 'Auto-detects spoken language live'
                  : (speechMode === 'en' ? 'Speak English → Translates to Manipuri' : 'Speak Manipuri → Translates to English')}
              </Text>
            </View>
          )}

          {/* ════════════════ THE ONE CENTRAL MIC BUTTON ════════════════ */}
          <View style={styles.micWrapper}>
            <View style={styles.pulseContainer}>
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseAnim }],
                    backgroundColor: isRecording
                      ? '#EF444435'
                      : (isProcessing ? '#0D948835' : colors.primary + '25'),
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
                onPress={handleMicPress}
                activeOpacity={0.85}
              >
                {isProcessing ? (
                  <ActivityIndicator size="large" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name={isRecording ? 'stop' : 'mic'}
                    size={46}
                    color="#FFFFFF"
                  />
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.statusText, { color: colors.text }]}>
              {statusMessage}
            </Text>
          </View>
        </View>

        {/* ════════════════ BOTTOM TEXT INPUT ════════════════ */}
        <View style={[styles.bottomInputBar, { backgroundColor: cardBg, borderTopColor: borderColor, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={[styles.inputFieldContainer, { backgroundColor: inputBg, borderColor }]}>
            <TextInput
              style={[styles.bottomTextInput, { color: colors.text }]}
              placeholder="Type English or Manipuri to speak..."
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
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 12,
    marginTop: 1,
    fontWeight: '500',
  },
  modeSelectorWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  modePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  centerStage: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  resultContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
  },
  spokenSubtext: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  translatedMainText: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  manipuriText: {
    fontSize: 28,
    lineHeight: 40,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D948818',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  replayBtnActive: {
    backgroundColor: '#0D9488',
  },
  replayBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  clearActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  clearActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyPromptContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyPromptTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyPromptSub: {
    fontSize: 13,
    marginTop: 6,
  },
  micWrapper: {
    alignItems: 'center',
    marginBottom: 30,
  },
  pulseContainer: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  singleMicButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
