import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioGuide } from '@/constants/destinations';
import { Colors } from '@/constants/theme';

interface AudioGuidePlayerProps {
  guide: AudioGuide;
  colors: (typeof Colors)['light' | 'dark'];
  isDark: boolean;
}

export function AudioGuidePlayer({ guide, colors, isDark }: AudioGuidePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [selectedLang, setSelectedLang] = useState(guide.languages[0]?.code || 'en');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showTranscript, setShowTranscript] = useState(false);

  const totalSec = guide.durationSec || 180;
  const timerRef = useRef<any>(null);

  // Active language text
  const activeLangObj =
    guide.languages.find((l) => l.code === selectedLang) || guide.languages[0];

  // Soundwave animated bars
  const waveHeights = [14, 26, 18, 34, 22, 38, 16, 28, 32, 20, 36, 18, 24];

  // Play / Pause toggle with speech synthesis support on Web
  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const playAudio = () => {
    setIsPlaying(true);
    // On web, use SpeechSynthesis if available
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(activeLangObj.text);
      utterance.rate = playbackSpeed;
      utterance.lang = selectedLang === 'mni' ? 'hi-IN' : 'en-US';
      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentSec(0);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const pauseAudio = () => {
    setIsPlaying(false);
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Timer interval to progress elapsed seconds
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentSec((prev) => {
          if (prev >= totalSec) {
            pauseAudio();
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, totalSec]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (Platform.OS === 'web' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Format MM:SS
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const seekRelative = (diff: number) => {
    setCurrentSec((prev) => Math.max(0, Math.min(totalSec, prev + diff)));
  };

  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
    if (isPlaying && Platform.OS === 'web' && 'speechSynthesis' in window) {
      pauseAudio();
      setTimeout(playAudio, 100);
    }
  };

  const progressPercent = Math.min(100, (currentSec / totalSec) * 100);

  const cardBg = isDark ? '#1C1D24' : '#FFFFFF';
  const innerBg = isDark ? '#14151B' : '#F8F9FA';

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor: colors.border }]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={[styles.audioIconCircle, { backgroundColor: isDark ? 'rgba(15,118,110,0.2)' : '#E6F4F1' }]}>
            <Ionicons name="headset" size={17} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.companionTag, { color: colors.primary }]}>AUDIO COMPANION</Text>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {guide.title}
            </Text>
          </View>
        </View>

        {/* Speed Pill */}
        <TouchableOpacity
          style={[styles.speedPill, { borderColor: colors.border, backgroundColor: innerBg }]}
          onPress={cycleSpeed}>
          <Text style={[styles.speedText, { color: colors.text }]}>{playbackSpeed}x</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.narratorText, { color: colors.textSecondary }]}>
        {guide.narrator}
      </Text>

      {/* Language Switcher */}
      <View style={styles.langRow}>
        {guide.languages.map((lang) => {
          const isSelected = lang.code === selectedLang;
          return (
            <TouchableOpacity
              key={lang.code}
              onPress={() => {
                if (isSelected) return;
                pauseAudio();
                setSelectedLang(lang.code);
                setCurrentSec(0);
              }}
              style={[
                styles.langChip,
                isSelected
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: innerBg, borderColor: colors.border },
              ]}>
              <Text
                style={[
                  styles.langChipText,
                  { color: isSelected ? '#FFFFFF' : colors.textSecondary, fontWeight: isSelected ? '700' : '500' },
                ]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Animated Soundwave & Progress Area */}
      <View style={[styles.waveContainer, { backgroundColor: innerBg, borderColor: colors.border }]}>
        <View style={styles.barsRow}>
          {waveHeights.map((h, i) => (
            <View
              key={i}
              style={[
                styles.waveBar,
                {
                  height: isPlaying ? h * (0.6 + ((i % 4) * 0.15)) : 6,
                  backgroundColor: i / waveHeights.length <= progressPercent / 100 ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Scrubber Bar */}
        <View style={[styles.scrubberTrack, { backgroundColor: isDark ? '#272832' : '#E5E7EB' }]}>
          <View
            style={[styles.scrubberFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]}
          />
        </View>

        {/* Time stamps */}
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatTime(currentSec)}</Text>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>{guide.duration}</Text>
        </View>
      </View>

      {/* Controls Bar */}
      <View style={styles.controlsRow}>
        {/* Rewind 15s */}
        <TouchableOpacity
          style={styles.seekBtn}
          onPress={() => seekRelative(-15)}
          accessibilityLabel="Rewind 15 seconds">
          <Ionicons name="play-back" size={20} color={colors.text} />
          <Text style={[styles.seekBtnText, { color: colors.textSecondary }]}>-15s</Text>
        </TouchableOpacity>

        {/* Main Play/Pause Button */}
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: colors.primary }]}
          onPress={togglePlay}
          accessibilityLabel={isPlaying ? 'Pause Audio Guide' : 'Play Audio Guide'}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#FFFFFF" style={{ marginLeft: isPlaying ? 0 : 2 }} />
        </TouchableOpacity>

        {/* Forward 15s */}
        <TouchableOpacity
          style={styles.seekBtn}
          onPress={() => seekRelative(15)}
          accessibilityLabel="Fast forward 15 seconds">
          <Ionicons name="play-forward" size={20} color={colors.text} />
          <Text style={[styles.seekBtnText, { color: colors.textSecondary }]}>+15s</Text>
        </TouchableOpacity>

        {/* Transcript Toggle */}
        <TouchableOpacity
          style={[styles.transcriptBtn, { borderColor: colors.border, backgroundColor: innerBg }]}
          onPress={() => setShowTranscript((prev) => !prev)}>
          <Ionicons name="document-text-outline" size={15} color={showTranscript ? colors.primary : colors.textSecondary} />
          <Text style={[styles.transcriptBtnText, { color: showTranscript ? colors.primary : colors.textSecondary }]}>
            Transcript
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expandable Transcript Drawer */}
      {showTranscript && (
        <View style={[styles.transcriptBox, { backgroundColor: innerBg, borderColor: colors.border }]}>
          <Text style={[styles.transcriptTitle, { color: colors.text }]}>Narration Transcript</Text>
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
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  audioIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionTag: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
  narratorText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 48,
  },
  speedPill: {
    paddingHorizontal: 9,
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
    marginTop: 12,
    paddingTop: 8,
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  langChipText: {
    fontSize: 11.5,
  },
  waveContainer: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 38,
    paddingHorizontal: 8,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    transition: 'height 0.2s ease',
  } as any,
  scrubberTrack: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    marginTop: 8,
    overflow: 'hidden',
  },
  scrubberFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 8,
  },
  seekBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: 4,
  },
  seekBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  transcriptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  transcriptBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  transcriptBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  transcriptTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  transcriptText: {
    fontSize: 12.5,
    lineHeight: 19,
    fontStyle: 'italic',
  },
});
