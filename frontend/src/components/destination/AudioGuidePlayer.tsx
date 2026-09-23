import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import { AudioGuide } from '@/constants/destinations';
import { Colors } from '@/constants/theme';
import {
  synthesizeTextToSpeech,
  fetchAutoAudioTranscript,
  fetchPregeneratedAudioGuide,
} from '@/utils/meerupApi';
import { PREGENERATED_STORIES, getPregeneratedAudio } from '@/constants/pregeneratedStories';

// Safe expo-audio imports (Expo SDK 57 native audio standard)
let createAudioPlayer: any = null;
let setAudioModeAsync: any = null;
try {
  const expoAudio = require('expo-audio');
  createAudioPlayer = expoAudio.createAudioPlayer;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
} catch (e) {
  // expo-audio fallback handled
}

interface AudioGuidePlayerProps {
  guide: AudioGuide;
  colors: (typeof Colors)['light' | 'dark'];
  isDark: boolean;
  destinationName?: string;
  destinationId?: string;
}

export function AudioGuidePlayer({
  guide,
  colors,
  isDark,
  destinationName,
  destinationId,
}: AudioGuidePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'en' | 'mni'>('en');

  // Match pregenerated guide key (e.g. kangla-fort, loktak-lake, ima-keithel, etc.)
  const guideKey = (destinationId || guide.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  const matchedPregenKey =
    Object.keys(PREGENERATED_STORIES).find(
      (k) => guideKey.includes(k) || k.includes(guideKey)
    ) || '';

  const pregenStory = matchedPregenKey ? PREGENERATED_STORIES[matchedPregenKey] : null;

  // Initialize transcripts directly from pregenerated stories for instant 0ms render
  const [autoTranscripts, setAutoTranscripts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (pregenStory) {
      initial.en = pregenStory.transcriptEn;
      initial.mni = pregenStory.transcriptMni;
    }
    return initial;
  });

  // Sound instance references
  const activeNativePlayerRef = useRef<any>(null);
  const webAudioRef = useRef<any>(null);
  const webViewRef = useRef<any>(null);
  const isWebViewLoadedRef = useRef<boolean>(false);
  // Cache base64 audio per language so repeat plays are instant
  const audioCacheRef = useRef<Record<string, string>>({});

  // Pre-seed audioCache from pregenerated store immediately
  useEffect(() => {
    if (matchedPregenKey) {
      const enAudio = getPregeneratedAudio(matchedPregenKey, 'en');
      const mniAudio = getPregeneratedAudio(matchedPregenKey, 'mni');
      if (enAudio) audioCacheRef.current['en'] = enAudio;
      if (mniAudio) audioCacheRef.current['mni'] = mniAudio;

      // Also ensure backend pregenerated fallback is ready if needed
      if (!audioCacheRef.current[selectedLang]) {
        fetchPregeneratedAudioGuide(matchedPregenKey, selectedLang)
          .then((res) => {
            if (res?.audioBase64) {
              audioCacheRef.current[selectedLang] = res.audioBase64;
            }
          })
          .catch(() => {});
      }
    }
  }, [matchedPregenKey, selectedLang]);

  // Fallback language object if offline
  const activeLangObj =
    guide.languages.find((l) => l.code === selectedLang) || guide.languages[0];

  // Auto-generate narration transcript from AI model on demand
  const getOrFetchTranscript = async (lang: 'en' | 'mni', forceRefresh = false): Promise<string> => {
    if (!forceRefresh && autoTranscripts[lang]) {
      return autoTranscripts[lang];
    }
    setIsLoadingTranscript(true);
    try {
      const res = await fetchAutoAudioTranscript(
        guide.title,
        destinationName,
        undefined,
        lang
      );
      if (res && res.transcript) {
        setAutoTranscripts((prev) => ({ ...prev, [lang]: res.transcript }));
        return res.transcript;
      }
    } catch (e) {
      console.warn('Auto transcript generation notice:', e);
    } finally {
      setIsLoadingTranscript(false);
    }
    return activeLangObj?.text || guide.title;
  };

  // If no pregenerated story exists, request model transcript on mount and on language toggle
  useEffect(() => {
    if (!autoTranscripts[selectedLang]) {
      getOrFetchTranscript(selectedLang);
    }
  }, [selectedLang, guide.title]);

  const activeTranscript =
    autoTranscripts[selectedLang] ||
    activeLangObj?.text ||
    `Welcome to ${guide.title}. Explore the sacred history, mythical lore, and timeless heritage of Manipur.`;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = async () => {
    if (activeNativePlayerRef.current) {
      try {
        activeNativePlayerRef.current.pause();
        activeNativePlayerRef.current.remove?.();
      } catch (e) {}
      activeNativePlayerRef.current = null;
    }
    if (webViewRef.current) {
      try {
        webViewRef.current.injectJavaScript(
          'if (window._guideAudio) { window._guideAudio.pause(); window._guideAudio.currentTime = 0; } true;'
        );
      } catch (e) {}
    }
    if (webAudioRef.current) {
      try {
        webAudioRef.current.pause();
        webAudioRef.current.currentTime = 0;
      } catch (e) {}
      webAudioRef.current = null;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).speechSynthesis) {
      (window as any).speechSynthesis.cancel();
    }
    isWebViewLoadedRef.current = false;
    setIsPlaying(false);
  };

  // Play audio synthesized by AI4Bharat / Neural model or instant pregenerated audio
  const playAudio = async () => {
    // 1. Resume if already loaded & paused
    if (activeNativePlayerRef.current) {
      try {
        activeNativePlayerRef.current.play();
        setIsPlaying(true);
        return;
      } catch (e) {}
    }
    if (webViewRef.current && isWebViewLoadedRef.current) {
      try {
        webViewRef.current.injectJavaScript(
          'if (window._guideAudio) { window._guideAudio.play(); } true;'
        );
        setIsPlaying(true);
        return;
      } catch (e) {}
    }
    if (webAudioRef.current) {
      try {
        await webAudioRef.current.play();
        setIsPlaying(true);
        return;
      } catch (e) {}
    }

    await stopAllAudio();
    setIsLoadingAudio(true);

    try {
      let transcriptText = autoTranscripts[selectedLang];
      if (!transcriptText) {
        transcriptText = await getOrFetchTranscript(selectedLang);
      }

      // 1. Check in-memory audioCache
      let b64 = audioCacheRef.current[selectedLang];

      // 2. Check pregenerated constant store (instant zero-latency)
      if (!b64 && matchedPregenKey) {
        const localAudio = getPregeneratedAudio(matchedPregenKey, selectedLang);
        if (localAudio) {
          b64 = localAudio;
          audioCacheRef.current[selectedLang] = b64;
        }
      }

      // 3. Check pregenerated backend endpoint
      if (!b64 && matchedPregenKey) {
        try {
          const pregenRes = await fetchPregeneratedAudioGuide(matchedPregenKey, selectedLang);
          if (pregenRes?.audioBase64) {
            b64 = pregenRes.audioBase64;
            audioCacheRef.current[selectedLang] = b64;
          }
        } catch (e) {}
      }

      // 4. Live neural TTS synthesis if not pregenerated
      if (!b64) {
        const result = await synthesizeTextToSpeech(transcriptText, selectedLang, 'female');
        if (result.audioBase64) {
          b64 = result.audioBase64;
          audioCacheRef.current[selectedLang] = b64;
        }
      }

      if (b64) {
        const cleanB64 = b64.includes(',') ? b64.split(',')[1] : b64;

        // Engine A: Browser HTML5 Audio (Web)
        if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
          const snd = new (window as any).Audio(`data:audio/wav;base64,${cleanB64}`);
          webAudioRef.current = snd;

          snd.onended = () => {
            setIsPlaying(false);
          };
          snd.onerror = () => {
            setIsPlaying(false);
          };

          await snd.play();
          setIsPlaying(true);
          setIsLoadingAudio(false);
          return;
        }

        // Engine B: Native expo-audio (SDK 57)
        if (createAudioPlayer && FileSystem.cacheDirectory) {
          try {
            if (setAudioModeAsync) {
              await setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: false,
              }).catch(() => {});
            }

            const tempUri = `${FileSystem.cacheDirectory}guide_${matchedPregenKey || 'story'}_${selectedLang}.wav`;
            await FileSystem.writeAsStringAsync(tempUri, cleanB64, {
              encoding: FileSystem.EncodingType?.Base64 || 'base64',
            });

            const player = createAudioPlayer(tempUri);
            activeNativePlayerRef.current = player;
            player.addListener('playbackStatusUpdate', (status: any) => {
              if (status?.didJustFinish) {
                setIsPlaying(false);
              }
            });

            player.play();
            setIsPlaying(true);
            setIsLoadingAudio(false);
            return;
          } catch (nativeErr) {
            console.log('Native expo-audio fallback to WebView bridge:', nativeErr);
          }
        }

        // Engine C: Universal WebView HTML5 Audio bridge (100% reliable on Android & iOS)
        if (webViewRef.current) {
          try {
            const playScript = `
              (function() {
                try {
                  if (window._guideAudio) {
                    window._guideAudio.pause();
                  }
                  var audio = new Audio("data:audio/wav;base64,${cleanB64}");
                  window._guideAudio = audio;
                  audio.onended = function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ended' }));
                  };
                  audio.onerror = function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
                  };
                  audio.onplay = function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'play' }));
                  };
                  audio.onpause = function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pause' }));
                  };
                  audio.play().catch(function(err) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err.message }));
                  });
                } catch (e) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: e.message }));
                }
              })();
              true;
            `;
            webViewRef.current.injectJavaScript(playScript);
            isWebViewLoadedRef.current = true;
            setIsPlaying(true);
            setIsLoadingAudio(false);
            return;
          } catch (wvErr) {
            console.log('WebView bridge playback notice:', wvErr);
          }
        }
      }
    } catch (apiErr) {
      console.warn('Audio playback notice:', apiErr);
    }

    // Engine D: Fallback Web SpeechSynthesis
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(activeTranscript);
      utterance.lang = selectedLang === 'mni' ? 'hi-IN' : 'en-US';
      utterance.onend = () => {
        setIsPlaying(false);
      };
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }

    setIsLoadingAudio(false);
  };

  const pauseAudio = async () => {
    setIsPlaying(false);
    if (activeNativePlayerRef.current) {
      try {
        activeNativePlayerRef.current.pause();
      } catch (e) {}
    }
    if (webViewRef.current) {
      try {
        webViewRef.current.injectJavaScript(
          'if (window._guideAudio) { window._guideAudio.pause(); } true;'
        );
      } catch (e) {}
    }
    if (webAudioRef.current) {
      try {
        webAudioRef.current.pause();
      } catch (e) {}
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).speechSynthesis) {
      (window as any).speechSynthesis.cancel();
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const handleLangChange = async (langCode: 'en' | 'mni') => {
    if (langCode === selectedLang) return;
    await stopAllAudio();
    setIsPlaying(false);
    setSelectedLang(langCode);
  };

  const handleRegenerate = async () => {
    await stopAllAudio();
    setIsPlaying(false);
    delete audioCacheRef.current[selectedLang];
    await getOrFetchTranscript(selectedLang, true);
  };

  // Theme palettes
  const cardBg = isDark ? '#111319' : '#FFFFFF';
  const cardBorder = isDark ? '#232733' : '#E2E8F0';
  const glassInner = isDark ? '#181B24' : '#F8FAFC';
  const accentTeal = '#0D9488';

  return (
    <View style={[styles.cardContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      {/* ── Top Header with Tag & Language Toggle ──────────────────────────── */}
      <View style={styles.topHeader}>
        <View style={styles.aiBadge}>
          <View style={[styles.aiDot, { backgroundColor: isPlaying ? '#10B981' : accentTeal }]} />
          <Text style={styles.aiBadgeText}>AUDIO COMPANION</Text>
        </View>

        {/* Language Segmented Toggle */}
        <View style={[styles.langSegment, { backgroundColor: glassInner, borderColor: cardBorder }]}>
          <TouchableOpacity
            style={[
              styles.langPill,
              selectedLang === 'en' && { backgroundColor: accentTeal },
            ]}
            onPress={() => handleLangChange('en')}
            activeOpacity={0.8}>
            <Text
              style={[
                styles.langPillText,
                { color: selectedLang === 'en' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B') },
              ]}>
              English
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.langPill,
              selectedLang === 'mni' && { backgroundColor: accentTeal },
            ]}
            onPress={() => handleLangChange('mni')}
            activeOpacity={0.8}>
            <Text
              style={[
                styles.langPillText,
                { color: selectedLang === 'mni' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B') },
              ]}>
              ꯃৈতৈꯂꯣꯟ (Manipuri)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Title (No Dr. Sanatombi Devi line) ───────────────────────────────── */}
      <View style={styles.titleSection}>
        <Text style={[styles.mainTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={2}>
          {guide.title}
        </Text>
      </View>

      {/* ── Auto-Generated Transcript Card ─────────────────────────────────── */}
      <View style={[styles.transcriptContainer, { backgroundColor: glassInner, borderColor: cardBorder }]}>
        <View style={styles.transcriptMetaRow}>
          <View style={styles.transcriptLiveTag}>
            <Ionicons name="sparkles" size={13} color={accentTeal} />
            <Text style={styles.transcriptTagText}>
              {selectedLang === 'mni' ? 'AI ꯃꯣꯗꯦꯜ ꯇ꯭ꯔꯥꯟꯁꯀ꯭ꯔꯤꯞ' : 'AI MODEL TRANSCRIPT'}
            </Text>
          </View>

          {/* Regenerate Story Button */}
          <TouchableOpacity
            style={styles.regenerateBtn}
            onPress={handleRegenerate}
            disabled={isLoadingTranscript}
            activeOpacity={0.7}>
            <Ionicons
              name="refresh"
              size={12}
              color={isLoadingTranscript ? '#94A3B8' : accentTeal}
            />
            <Text style={[styles.regenerateText, { color: accentTeal }]}>New Story</Text>
          </TouchableOpacity>
        </View>

        {isLoadingTranscript && !autoTranscripts[selectedLang] ? (
          <View style={styles.transcriptLoader}>
            <ActivityIndicator size="small" color={accentTeal} />
            <Text style={[styles.loaderText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {selectedLang === 'mni'
                ? 'AI ꯃꯣꯗꯦꯜꯅ ꯃꯅꯤꯄꯨꯔꯤ ꯋꯥꯔꯤ ꯁꯦꯝꯂꯤ...'
                : 'Composing story transcript with AI model...'}
            </Text>
          </View>
        ) : (
          <Text
            style={[
              styles.transcriptContentText,
              {
                color: isDark ? '#CBD5E1' : '#334155',
                lineHeight: selectedLang === 'mni' ? 24 : 22,
                fontSize: selectedLang === 'mni' ? 14 : 13.5,
              },
            ]}>
            "{activeTranscript}"
          </Text>
        )}
      </View>

      {/* ── Only Play Button (No Scrubber, No Bars, No Speed, No -15s/+15s) ─── */}
      <TouchableOpacity
        style={[
          styles.masterPlayBtn,
          {
            backgroundColor: isPlaying ? (isDark ? '#1E293B' : '#F1F5F9') : accentTeal,
            borderColor: isPlaying ? accentTeal : 'transparent',
          },
        ]}
        onPress={togglePlay}
        disabled={isLoadingAudio}
        activeOpacity={0.85}
        accessibilityLabel={isPlaying ? 'Pause Narration' : 'Play Narration'}>
        {isLoadingAudio ? (
          <View style={styles.playBtnInner}>
            <ActivityIndicator size="small" color={isPlaying ? accentTeal : '#FFFFFF'} />
            <Text style={[styles.playBtnText, { color: isPlaying ? accentTeal : '#FFFFFF' }]}>
              {selectedLang === 'mni' ? 'ꯈꯣꯟꯊꯣꯛ ꯁꯦꯝꯂꯤ...' : 'Generating Voice...'}
            </Text>
          </View>
        ) : (
          <View style={styles.playBtnInner}>
            <Ionicons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={24}
              color={isPlaying ? accentTeal : '#FFFFFF'}
            />
            <Text style={[styles.playBtnText, { color: isPlaying ? accentTeal : '#FFFFFF' }]}>
              {isPlaying
                ? (selectedLang === 'mni' ? 'ꯂꯦꯞꯄꯨ (Pause)' : 'Pause Narration')
                : (selectedLang === 'mni' ? 'ꯋꯥꯔꯤ ꯇꯥꯕꯤꯌꯨ (Play Story)' : 'Play Story Narration')}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Invisible HTML5 Audio WebView bridge for 100% reliable native audio playback */}
      {Platform.OS !== 'web' && (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }}
          source={{ html: '<!DOCTYPE html><html><head></head><body></body></html>' }}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          javaScriptEnabled={true}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'ended' || data.type === 'error') {
                setIsPlaying(false);
                isWebViewLoadedRef.current = false;
              } else if (data.type === 'play') {
                setIsPlaying(true);
              } else if (data.type === 'pause') {
                setIsPlaying(false);
              }
            } catch (e) {
              if (event.nativeEvent.data === 'ended' || event.nativeEvent.data === 'error') {
                setIsPlaying(false);
                isWebViewLoadedRef.current = false;
              }
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.8,
  },
  langSegment: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  titleSection: {
    marginTop: 14,
    marginBottom: 10,
  },
  mainTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  transcriptContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  transcriptMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transcriptLiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  transcriptTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.8,
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
  },
  regenerateText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  transcriptLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loaderText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  transcriptContentText: {
    fontStyle: 'italic',
  },
  masterPlayBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  playBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
