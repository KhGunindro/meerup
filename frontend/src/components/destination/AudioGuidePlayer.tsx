import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { AudioGuide } from '@/constants/destinations';
import { Colors } from '@/constants/theme';
import { synthesizeTextToSpeech, fetchAutoAudioTranscript } from '@/utils/meerupApi';

// Safely require expo-av runtime
let AudioRuntime: any = null;
try {
  AudioRuntime = require('expo-av').Audio;
} catch (e) {
  // expo-av fallback handled
}

interface AudioGuidePlayerProps {
  guide: AudioGuide;
  colors: (typeof Colors)['light' | 'dark'];
  isDark: boolean;
  destinationName?: string;
}

export function AudioGuidePlayer({
  guide,
  colors,
  isDark,
  destinationName,
}: AudioGuidePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [autoTranscripts, setAutoTranscripts] = useState<Record<string, string>>({});
  const [currentSec, setCurrentSec] = useState(0);
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null);
  const [selectedLang, setSelectedLang] = useState<'en' | 'mni'>('en');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Sound instance references
  const nativeSoundRef = useRef<any>(null);
  const webAudioRef = useRef<any>(null);
  // Cache base64 audio per language so repeat plays are instant
  const audioCacheRef = useRef<Record<string, string>>({});
  const timerFallbackRef = useRef<any>(null);

  // Soundwave animation pulse
  const waveAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(waveAnim, {
            toValue: 0.3,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      waveAnim.stopAnimation();
      waveAnim.setValue(0.3);
    }
  }, [isPlaying]);

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
        guide.narrator,
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

  // Automatically request model transcript on mount and on language toggle
  useEffect(() => {
    getOrFetchTranscript(selectedLang);
  }, [selectedLang, guide.title]);

  const activeTranscript =
    autoTranscripts[selectedLang] ||
    activeLangObj?.text ||
    `Welcome to ${guide.title}. Explore the sacred history, mythical lore, and timeless heritage of Manipur.`;

  const totalSec = audioDurationSec || guide.durationSec || 60;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = async () => {
    if (timerFallbackRef.current) {
      clearInterval(timerFallbackRef.current);
      timerFallbackRef.current = null;
    }
    if (webAudioRef.current) {
      try {
        webAudioRef.current.pause();
        webAudioRef.current.currentTime = 0;
      } catch (e) {}
      webAudioRef.current = null;
    }
    if (nativeSoundRef.current) {
      try {
        await nativeSoundRef.current.stopAsync();
        await nativeSoundRef.current.unloadAsync();
      } catch (e) {}
      nativeSoundRef.current = null;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).speechSynthesis) {
      (window as any).speechSynthesis.cancel();
    }
  };

  // Play audio synthesized by AI4Bharat / Neural model from the auto-generated transcript
  const playAudio = async () => {
    if (nativeSoundRef.current) {
      try {
        await nativeSoundRef.current.playAsync();
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

      let b64 = audioCacheRef.current[selectedLang];
      if (!b64) {
        const result = await synthesizeTextToSpeech(transcriptText, selectedLang, 'female');
        if (result.audioBase64) {
          b64 = result.audioBase64;
          audioCacheRef.current[selectedLang] = b64;
        }
      }

      if (b64) {
        const cleanB64 = b64.includes(',') ? b64.split(',')[1] : b64;

        // 1. Web Audio
        if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
          const snd = new (window as any).Audio(`data:audio/wav;base64,${cleanB64}`);
          webAudioRef.current = snd;
          snd.playbackRate = playbackSpeed;
          snd.currentTime = currentSec;

          snd.ontimeupdate = () => {
            setCurrentSec(Math.floor(snd.currentTime));
            if (snd.duration && isFinite(snd.duration)) {
              setAudioDurationSec(Math.round(snd.duration));
            }
          };

          snd.onended = () => {
            setIsPlaying(false);
            setCurrentSec(0);
          };

          await snd.play();
          setIsPlaying(true);
          setIsLoadingAudio(false);
          return;
        }

        // 2. Native expo-av Sound
        if (AudioRuntime && FileSystem.cacheDirectory) {
          try {
            await AudioRuntime.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              staysActiveInBackground: false,
              shouldDuckAndroid: true,
            });

            const tempUri = `${FileSystem.cacheDirectory}guide_${guide.title.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedLang}.wav`;
            await FileSystem.writeAsStringAsync(tempUri, cleanB64, {
              encoding: FileSystem.EncodingType?.Base64 || 'base64',
            });

            const { sound } = await AudioRuntime.Sound.createAsync(
              { uri: tempUri },
              {
                shouldPlay: true,
                positionMillis: currentSec * 1000,
                rate: playbackSpeed,
                shouldCorrectPitch: true,
              },
              (status: any) => {
                if (status.isLoaded) {
                  if (status.durationMillis) {
                    setAudioDurationSec(Math.round(status.durationMillis / 1000));
                  }
                  setCurrentSec(Math.round(status.positionMillis / 1000));
                  if (status.didJustFinish) {
                    setIsPlaying(false);
                    setCurrentSec(0);
                  }
                }
              }
            );

            nativeSoundRef.current = sound;
            setIsPlaying(true);
            setIsLoadingAudio(false);
            return;
          } catch (nativeErr) {
            console.warn('Native Audio Guide playback notice:', nativeErr);
          }
        }
      }
    } catch (apiErr) {
      console.warn('AI TTS Model request notice:', apiErr);
    }

    // 3. Fallback Web SpeechSynthesis
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(activeTranscript);
      utterance.rate = playbackSpeed;
      utterance.lang = selectedLang === 'mni' ? 'hi-IN' : 'en-US';
      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentSec(0);
      };
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);

      timerFallbackRef.current = setInterval(() => {
        setCurrentSec((prev) => {
          if (prev >= totalSec) {
            pauseAudio();
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }

    setIsLoadingAudio(false);
  };

  const pauseAudio = async () => {
    setIsPlaying(false);
    if (timerFallbackRef.current) {
      clearInterval(timerFallbackRef.current);
      timerFallbackRef.current = null;
    }
    if (webAudioRef.current) {
      try {
        webAudioRef.current.pause();
      } catch (e) {}
    }
    if (nativeSoundRef.current) {
      try {
        await nativeSoundRef.current.pauseAsync();
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

  const seekRelative = async (diff: number) => {
    const newSec = Math.max(0, Math.min(totalSec, currentSec + diff));
    setCurrentSec(newSec);
    if (webAudioRef.current) {
      try {
        webAudioRef.current.currentTime = newSec;
      } catch (e) {}
    }
    if (nativeSoundRef.current) {
      try {
        await nativeSoundRef.current.setPositionAsync(newSec * 1000);
      } catch (e) {}
    }
  };

  const cycleSpeed = async () => {
    const speeds = [1.0, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);

    if (webAudioRef.current) {
      try {
        webAudioRef.current.playbackRate = nextSpeed;
      } catch (e) {}
    }
    if (nativeSoundRef.current) {
      try {
        await nativeSoundRef.current.setRateAsync(nextSpeed, true);
      } catch (e) {}
    }
  };

  const handleLangChange = async (langCode: 'en' | 'mni') => {
    if (langCode === selectedLang) return;
    await stopAllAudio();
    setIsPlaying(false);
    setCurrentSec(0);
    setSelectedLang(langCode);
  };

  const handleRegenerate = async () => {
    await stopAllAudio();
    setIsPlaying(false);
    setCurrentSec(0);
    // Invalidate audio cache for this language
    delete audioCacheRef.current[selectedLang];
    await getOrFetchTranscript(selectedLang, true);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, Math.max(0, (currentSec / totalSec) * 100));

  // Visualizer soundwave bars (16 bars)
  const barHeights = [14, 22, 10, 26, 32, 18, 28, 36, 24, 30, 16, 28, 34, 20, 24, 12];

  // Theme palettes for premium aesthetics
  const cardBg = isDark ? '#111319' : '#FFFFFF';
  const cardBorder = isDark ? '#232733' : '#E2E8F0';
  const glassInner = isDark ? '#181B24' : '#F8FAFC';
  const accentTeal = '#0D9488';
  const accentTealGlow = 'rgba(13, 148, 136, 0.15)';

  return (
    <View style={[styles.cardContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      {/* ── Top Header with AI Badge & Language Toggle ─────────────────────── */}
      <View style={styles.topHeader}>
        <View style={styles.aiBadge}>
          <View style={[styles.aiDot, { backgroundColor: isPlaying ? '#10B981' : accentTeal }]} />
          <Text style={styles.aiBadgeText}>AI COMPANION</Text>
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
              ꯃৈতৈꯂꯣꯟ
            </Text>
          </TouchableOpacity>
        </View>

        {/* Speed Pill */}
        <TouchableOpacity
          style={[styles.speedButton, { backgroundColor: glassInner, borderColor: cardBorder }]}
          onPress={cycleSpeed}
          activeOpacity={0.7}>
          <Text style={[styles.speedButtonText, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
            {playbackSpeed}x
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Story Info ────────────────────────────────────────────────────────── */}
      <View style={styles.titleSection}>
        <Text style={[styles.mainTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={2}>
          {guide.title}
        </Text>
        <View style={styles.narratorRow}>
          <Ionicons name="sparkles" size={13} color={accentTeal} />
          <Text style={[styles.narratorLabel, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
            {guide.narrator || 'AI Cultural Storyteller · Manipur'}
          </Text>
        </View>
      </View>

      {/* ── Auto-Generated Transcript Card (Prominent & Live) ────────────────── */}
      <View style={[styles.transcriptContainer, { backgroundColor: glassInner, borderColor: cardBorder }]}>
        <View style={styles.transcriptMetaRow}>
          <View style={styles.transcriptLiveTag}>
            <Ionicons name="document-text" size={13} color={accentTeal} />
            <Text style={styles.transcriptTagText}>
              {selectedLang === 'mni' ? 'AI ꯃꯣꯗꯦꯜꯒꯤ ꯇ꯭ꯔꯥꯟꯁꯀ꯭ꯔꯤꯞ' : 'AI MODEL AUTO-TRANSCRIPT'}
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
                ? 'AI ꯃꯣꯗꯦꯜꯅ ꯃꯅꯤꯄꯨꯔꯤ ꯋꯥꯔꯤ ꯊꯧꯔꯥꯡ ꯇꯧꯔꯤ...'
                : 'Generating cultural narration with AI model...'}
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

      {/* ── Dynamic Audio Soundwave Rhythm Bars ─────────────────────────────── */}
      <View style={styles.soundwaveRow}>
        {barHeights.map((h, i) => {
          const isPassed = (i / barHeights.length) * 100 <= progressPercent;
          return (
            <Animated.View
              key={i}
              style={[
                styles.soundBar,
                {
                  height: isPlaying ? h * (0.5 + ((i % 4) * 0.18)) : 6,
                  backgroundColor: isPassed
                    ? accentTeal
                    : isDark
                    ? '#2A303C'
                    : '#CBD5E1',
                  opacity: isPlaying ? waveAnim : 0.6,
                },
              ]}
            />
          );
        })}
      </View>

      {/* ── Progress Track & Timestamps ─────────────────────────────────────── */}
      <View style={styles.progressSection}>
        <View style={[styles.trackBg, { backgroundColor: isDark ? '#232834' : '#E2E8F0' }]}>
          <View
            style={[
              styles.trackActive,
              { width: `${progressPercent}%`, backgroundColor: accentTeal },
            ]}
          />
        </View>

        <View style={styles.timeInfoRow}>
          <Text style={[styles.timeLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {formatTime(currentSec)}
          </Text>
          <Text style={[styles.timeLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {formatTime(totalSec)}
          </Text>
        </View>
      </View>

      {/* ── Player Controls Row (-15s, Play/Pause, +15s) ────────────────────── */}
      <View style={styles.controlsBar}>
        {/* Rewind -15s */}
        <TouchableOpacity
          style={[styles.seekCircle, { backgroundColor: glassInner, borderColor: cardBorder }]}
          onPress={() => seekRelative(-15)}
          activeOpacity={0.7}
          accessibilityLabel="Rewind 15 seconds">
          <Ionicons name="play-back" size={19} color={isDark ? '#E2E8F0' : '#1E293B'} />
          <Text style={[styles.seekLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>-15s</Text>
        </TouchableOpacity>

        {/* Center Main Play / Pause Button with Neural Glow */}
        <TouchableOpacity
          style={[styles.masterPlayBtn, { backgroundColor: accentTeal }]}
          onPress={togglePlay}
          disabled={isLoadingAudio}
          activeOpacity={0.85}
          accessibilityLabel={isPlaying ? 'Pause Narration' : 'Play AI Voice Narration'}>
          {isLoadingAudio ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={26}
              color="#FFFFFF"
              style={{ marginLeft: isPlaying ? 0 : 2 }}
            />
          )}
        </TouchableOpacity>

        {/* Forward +15s */}
        <TouchableOpacity
          style={[styles.seekCircle, { backgroundColor: glassInner, borderColor: cardBorder }]}
          onPress={() => seekRelative(15)}
          activeOpacity={0.7}
          accessibilityLabel="Forward 15 seconds">
          <Ionicons name="play-forward" size={19} color={isDark ? '#E2E8F0' : '#1E293B'} />
          <Text style={[styles.seekLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>+15s</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    elevation: 4,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
    paddingVertical: 4,
    borderRadius: 10,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  speedButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  speedButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  titleSection: {
    marginTop: 14,
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  narratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  narratorLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  transcriptContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
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
  soundwaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  soundBar: {
    width: 3.5,
    borderRadius: 2,
  },
  progressSection: {
    marginBottom: 16,
  },
  trackBg: {
    height: 5,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  trackActive: {
    height: '100%',
    borderRadius: 3,
  },
  timeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 4,
  },
  seekCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  seekLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: -2,
  },
  masterPlayBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
});
