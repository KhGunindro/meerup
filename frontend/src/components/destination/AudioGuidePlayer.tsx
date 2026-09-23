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
import { AudioGuide } from '@/constants/destinations';
import { Colors } from '@/constants/theme';
import { synthesizeTextToSpeech } from '@/utils/meerupApi';

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
}

export function AudioGuidePlayer({ guide, colors, isDark }: AudioGuidePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null);
  const [selectedLang, setSelectedLang] = useState(guide.languages[0]?.code || 'en');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showTranscript, setShowTranscript] = useState(false);

  // Sound instance references
  const nativeSoundRef = useRef<any>(null);
  const webAudioRef = useRef<any>(null);
  // Cache base64 audio per language so repeat plays are instant
  const audioCacheRef = useRef<Record<string, string>>({});
  const timerFallbackRef = useRef<any>(null);

  // Active language narration text
  const activeLangObj =
    guide.languages.find((l) => l.code === selectedLang) || guide.languages[0];

  const totalSec = audioDurationSec || guide.durationSec || 225;

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

  // Play audio synthesized by AI4Bharat / Neural model
  const playAudio = async () => {
    // If sound is already loaded and paused, resume playback
    if (nativeSoundRef.current) {
      try {
        await nativeSoundRef.current.playAsync();
        setIsPlaying(true);
        return;
      } catch (e) {
        // Fallback to fresh synthesis
      }
    }
    if (webAudioRef.current) {
      try {
        await webAudioRef.current.play();
        setIsPlaying(true);
        return;
      } catch (e) {
        // Fallback to fresh synthesis
      }
    }

    // Stop any existing sound
    await stopAllAudio();

    setIsLoadingAudio(true);
    const targetLang = selectedLang === 'mni' ? 'mni' : 'en';

    try {
      let b64 = audioCacheRef.current[selectedLang];

      if (!b64) {
        // Call the user's AI neural TTS model via backend / ngrok
        const result = await synthesizeTextToSpeech(activeLangObj.text, targetLang, 'female');
        if (result.audioBase64) {
          b64 = result.audioBase64;
          audioCacheRef.current[selectedLang] = b64;
        }
      }

      if (b64) {
        const cleanB64 = b64.includes(',') ? b64.split(',')[1] : b64;

        // 1. Web environment: HTML5 Audio
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

        // 2. Native environment: expo-av Sound
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

    // 3. Fallback to Web SpeechSynthesis if model or native audio is unavailable
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(activeLangObj.text);
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
    if (isPlaying && Platform.OS === 'web' && 'speechSynthesis' in window && !webAudioRef.current) {
      pauseAudio();
      setTimeout(playAudio, 100);
    }
  };

  // Switch between English and Manipuri
  const handleLangChange = async (langCode: string) => {
    if (langCode === selectedLang) return;
    await stopAllAudio();
    setIsPlaying(false);
    setCurrentSec(0);
    setSelectedLang(langCode);
  };

  // Format MM:SS
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, Math.max(0, (currentSec / totalSec) * 100));

  // 11 Timeline Checkpoint Dots matching the UI design in the reference screenshot
  const totalDots = 11;
  const activeDotIndex = Math.min(
    totalDots - 1,
    Math.floor((progressPercent / 100) * totalDots)
  );

  const cardBg = isDark ? '#1C1D24' : '#FFFFFF';
  const innerBg = isDark ? '#14151B' : '#F6F8FA';

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor: colors.border }]}>
      {/* ── Header Row ────────────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.audioIconCircle,
              { backgroundColor: isDark ? 'rgba(15,118,110,0.2)' : '#E6F4F1' },
            ]}>
            <Ionicons name="headset" size={17} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.companionTag, { color: colors.primary }]}>AUDIO COMPANION</Text>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {guide.title}
            </Text>
          </View>
        </View>

        {/* Speed Pill (1x / 1.25x / 1.5x) */}
        <TouchableOpacity
          style={[styles.speedPill, { borderColor: isDark ? '#2D3139' : '#E5E7EB', backgroundColor: innerBg }]}
          onPress={cycleSpeed}
          activeOpacity={0.7}
          accessibilityLabel={`Playback speed ${playbackSpeed}x`}>
          <Text style={[styles.speedText, { color: colors.text }]}>{playbackSpeed}x</Text>
        </TouchableOpacity>
      </View>

      {/* Narrator */}
      <Text style={[styles.narratorText, { color: colors.textSecondary }]}>
        {guide.narrator}
      </Text>

      {/* ── Language Switcher (English / Manipuri) ───────────────────────────── */}
      <View style={styles.langRow}>
        {guide.languages.map((lang) => {
          const isSelected = lang.code === selectedLang;
          return (
            <TouchableOpacity
              key={lang.code}
              onPress={() => handleLangChange(lang.code)}
              activeOpacity={0.8}
              style={[
                styles.langChip,
                isSelected
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: isDark ? '#1F222A' : '#FFFFFF', borderColor: isDark ? '#2E323D' : '#E5E7EB' },
              ]}>
              <Text
                style={[
                  styles.langChipText,
                  {
                    color: isSelected ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#4B5563'),
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Timeline Checkpoints & Progress Scrubber Track ─────────────────── */}
      <View
        style={[
          styles.progressCard,
          { backgroundColor: innerBg, borderColor: isDark ? '#252932' : '#ECEFF2' },
        ]}>
        {/* Timeline Checkpoint Dots matching user design */}
        <View style={styles.dotsRow}>
          {Array.from({ length: totalDots }).map((_, idx) => {
            const isActive = idx <= activeDotIndex;
            return (
              <View
                key={idx}
                style={[
                  styles.checkpointDot,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : isDark
                      ? '#343842'
                      : '#D1D5DB',
                    transform: [{ scale: idx === activeDotIndex && isPlaying ? 1.3 : 1 }],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Continuous Scrubber Track */}
        <View style={[styles.scrubberTrack, { backgroundColor: isDark ? '#262933' : '#E5E7EB' }]}>
          <View
            style={[
              styles.scrubberFill,
              { width: `${progressPercent}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>

        {/* Timestamps */}
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatTime(currentSec)}
          </Text>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {guide.duration || formatTime(totalSec)}
          </Text>
        </View>
      </View>

      {/* ── Bottom Controls Row (-15s, Play/Pause with AI TTS, +15s, Transcript) ─ */}
      <View style={styles.controlsRow}>
        {/* Rewind 15s */}
        <TouchableOpacity
          style={styles.seekBtn}
          onPress={() => seekRelative(-15)}
          activeOpacity={0.7}
          accessibilityLabel="Rewind 15 seconds">
          <Ionicons name="play-back" size={21} color={colors.text} />
          <Text style={[styles.seekBtnText, { color: colors.textSecondary }]}>-15s</Text>
        </TouchableOpacity>

        {/* Center Main Play/Pause Button powered by AI Model */}
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: colors.primary }]}
          onPress={togglePlay}
          disabled={isLoadingAudio}
          activeOpacity={0.85}
          accessibilityLabel={isPlaying ? 'Pause Audio Guide' : 'Play Audio Guide with AI Voice'}>
          {isLoadingAudio ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color="#FFFFFF"
              style={{ marginLeft: isPlaying ? 0 : 2 }}
            />
          )}
        </TouchableOpacity>

        {/* Fast forward 15s */}
        <TouchableOpacity
          style={styles.seekBtn}
          onPress={() => seekRelative(15)}
          activeOpacity={0.7}
          accessibilityLabel="Fast forward 15 seconds">
          <Ionicons name="play-forward" size={21} color={colors.text} />
          <Text style={[styles.seekBtnText, { color: colors.textSecondary }]}>+15s</Text>
        </TouchableOpacity>

        {/* Transcript Toggle Button */}
        <TouchableOpacity
          style={[
            styles.transcriptBtn,
            {
              borderColor: isDark ? '#2E323D' : '#E5E7EB',
              backgroundColor: isDark ? '#1C1E26' : '#FFFFFF',
            },
          ]}
          onPress={() => setShowTranscript((prev) => !prev)}
          activeOpacity={0.7}>
          <Ionicons
            name="document-text-outline"
            size={15}
            color={showTranscript ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.transcriptBtnText,
              { color: showTranscript ? colors.primary : colors.textSecondary },
            ]}>
            Transcript
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Expandable Transcript Drawer ────────────────────────────────────── */}
      {showTranscript && (
        <View
          style={[
            styles.transcriptBox,
            { backgroundColor: innerBg, borderColor: isDark ? '#262933' : '#E2E8F0' },
          ]}>
          <View style={styles.transcriptHeader}>
            <Ionicons name="language" size={14} color={colors.primary} />
            <Text style={[styles.transcriptTitle, { color: colors.text }]}>
              {selectedLang === 'mni' ? 'ꯃৈতৈꯂꯣꯟ (Manipuri) Transcript' : 'English Transcript'}
            </Text>
          </View>
          <Text style={[styles.transcriptText, { color: colors.textSecondary }]}>
            "{activeLangObj.text}"
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    marginTop: 16,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  audioIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionTag: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  narratorText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 52,
    marginBottom: 2,
  },
  speedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  speedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 4,
  },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  langChipText: {
    fontSize: 12,
  },
  progressCard: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  checkpointDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  scrubberTrack: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  scrubberFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  seekBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: 6,
  },
  seekBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  playBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  transcriptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  transcriptBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  transcriptBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  transcriptTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  transcriptText: {
    fontSize: 12.5,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
