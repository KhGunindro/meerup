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
  useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { translateText, speechToSpeech, transcribeAudio } from '@/utils/meerupApi';

let AudioRuntime: typeof Audio | any;
try {
  AudioRuntime = require('expo-av').Audio;
} catch (e) {
  console.warn("expo-av native module not found. Audio features will be disabled.");
}
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
}

export default function MeerupScreen() {

  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [aiState, setAiState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeCard, setActiveCard] = useState<'kangla' | 'ima'>('kangla');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [languagePair, setLanguagePair] = useState<'Manipuri ↔ English' | 'Hindi ↔ Manipuri'>('Manipuri ↔ English');
  const [isMicMuted, setIsMicMuted] = useState(false);

  useEffect(() => {
    if (isVoiceMode && aiState === 'idle' && !isMicMuted) {
      startRecording();
    }
  }, [aiState, isVoiceMode, isMicMuted]);

  const toggleLanguagePair = () => {
    setLanguagePair(prev => prev === 'Manipuri ↔ English' ? 'Hindi ↔ Manipuri' : 'Manipuri ↔ English');
  };
  const handleSendText = async () => {
    if (!inputText.trim()) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputText.trim(), time: 'Just now' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setAiState('thinking');
    
    const response = await translateText(userMsg.text);
    
    setAiState('speaking');
    const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'ai', text: response.text || "Sorry, I couldn't understand.", time: 'Just now' };
    setMessages(prev => [...prev, aiMsg]);
    
    if (response.audioBase64 && AudioRuntime) {
      try {
        const uri = FileSystem.cacheDirectory + 'response.wav';
        await FileSystem.writeAsStringAsync(uri, response.audioBase64, { encoding: FileSystem.EncodingType.Base64 });
        const { sound } = await AudioRuntime.Sound.createAsync({ uri });
        await sound.playAsync();
      } catch (err) {
        console.error("Playback error:", err);
      }
    }
    
    setTimeout(() => setAiState('idle'), 2000);
  };


  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRecordingAndThink = async (rec: any) => {
    setAiState('thinking');
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
    
    let uri = '';
    try {
      if (rec && typeof rec.stopAndUnloadAsync === 'function') {
        await rec.stopAndUnloadAsync();
        uri = rec.getURI();
      }
    } catch (e) {
      console.warn("Could not stop recording", e);
    }
    setRecording(null);
    setIsSpeaking(false);
    
    if (!uri) {
      setAiState('idle');
      return;
    }

    try {
      // Call STS endpoint
      const response = await speechToSpeech(uri);
      
      if (response.text) {
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: '(Voice message sent)', time: 'Just now' };
        const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'ai', text: response.text, time: 'Just now' };
        setMessages(prev => [...prev, userMsg, aiMsg]);
      }
      
      setAiState('speaking');
      if (response.audioBase64 && AudioRuntime) {
        const outUri = FileSystem.cacheDirectory + 'sts_response.wav';
        await FileSystem.writeAsStringAsync(outUri, response.audioBase64, { encoding: FileSystem.EncodingType.Base64 });
        const { sound } = await AudioRuntime.Sound.createAsync({ uri: outUri });
        await sound.playAsync();
      }
    } catch (err) {
      console.error(err);
    }

    setTimeout(() => setAiState('idle'), 3000);
  };
  
  const startRecording = async () => {
    if (!AudioRuntime) {
      console.warn("Audio is not available - falling back to simulated UI mode");
      setAiState('listening');
      setIsSpeaking(true);
      
      // User must manually stop recording

      return;
    }
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
              if (level > -35) {
                setIsSpeaking(true);
                setIsSpeaking(true);
              } else {
                setIsSpeaking(false);
              }
            }
          },
          100
        );

        setRecording(newRecording);
        setAiState('listening');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const toggleListening = async () => {
    if (aiState === 'idle') {
      await startRecording();
    } else if (aiState === 'listening') {
      if (recording) {
        await stopRecordingAndThink(recording);
      } else {
        setAiState('thinking');
      }
    } else {
      setAiState('idle');
    }
  };

  const toggleMute = async () => {
    const willMute = !isMicMuted;
    setIsMicMuted(willMute);
    if (willMute && aiState === 'listening') {
      if (recording) {
        try { await recording.stopAndUnloadAsync(); } catch (e) {}
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


      {!isVoiceMode && (
        <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>


        {/* CHAT TRANSCRIPT */}
        <View style={styles.chatContainer}>
          {messages.map((msg, index) => {
            if (msg.role === 'user') {
              return (
                <View key={msg.id} style={styles.userMessageWrapper}>
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
                    <Text style={styles.aiMessageText}>
                      {msg.text}
                    </Text>
                    
                  </View>
                </View>
              );
            }
          })}
        </View>

        
      </ScrollView>

      {/* BOTTOM INPUT */}
      <View style={[styles.bottomInputContainer, { paddingBottom: isKeyboardVisible ? 4 : Math.max(insets.bottom, 10) }]}>


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
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
            />
          </View>

          {inputText.trim().length > 0 ? (
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendText}>
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
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', zIndex: 999, justifyContent: 'space-between' }]}>
          {/* Header */}
          <View style={{ height: Math.max(insets.top, 20) + 10 }} />


          {/* Center Content */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={styles.orbContainer}>
          <AnimatedPulseRing size={112} color="#4777c2" delay={0} active={aiState === 'listening'} />
          <AnimatedPulseRing size={112} color="#4777c2" delay={600} active={aiState === 'listening'} />
          <AnimatedPulseRing size={112} color="#4777c2" delay={1200} active={aiState === 'listening'} />
          <TouchableOpacity
            onPress={toggleListening}
            style={[
              styles.orbOuter,
              aiState === 'idle' && { borderColor: '#E5E7EB', opacity: 0.5 },
              aiState === 'listening' && { borderColor: '#4777c2' },
              aiState === 'thinking' && { borderColor: '#D97706' },
              aiState === 'speaking' && { borderColor: '#047857' },
            ]}
          >
            <View style={[
              styles.orbInner,
              aiState === 'idle' && { borderColor: '#E5E7EB' },
              aiState === 'listening' && { borderColor: '#4777c2' },
              aiState === 'thinking' && { borderColor: '#D97706' },
              aiState === 'speaking' && { borderColor: '#047857' },
            ]}>
              <MaterialIcons 
                name="mic" 
                size={24} 
                color={
                  aiState === 'listening' ? '#4777c2' : 
                  aiState === 'thinking' ? '#D97706' : 
                  aiState === 'speaking' ? '#047857' : 
                  '#9CA3AF'
                } 
                style={{ marginBottom: 2 }}
              />
              <Text style={[
                styles.orbText,
                aiState === 'idle' && { color: '#9CA3AF' },
                aiState === 'listening' && { color: '#4777c2' },
                aiState === 'thinking' && { color: '#D97706' },
                aiState === 'speaking' && { color: '#047857' },
              ]}>
                {aiState === 'idle' ? 'MEERUP' : aiState.charAt(0).toUpperCase() + aiState.slice(1)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

          </View>

          {/* Footer */}
          <View style={[styles.bottomInputContainer, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: 'transparent' }]}>
            <View style={[styles.inputRow, { justifyContent: 'space-between' }]}>
              {/* Left: Mic Disable */}
              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: '#1F2937', borderColor: '#374151' }]} onPress={toggleMute}>
                <MaterialIcons name={!isMicMuted ? "mic" : "mic-off"} size={20} color={!isMicMuted ? "#9CA3AF" : "#EF4444"} />
              </TouchableOpacity>

              {/* Center: Language Toggle */}
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#1F2937', borderRadius: 24, borderWidth: 1, borderColor: '#4B5563', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5 }}
                onPress={toggleLanguagePair}
              >
                <Text style={{ color: '#E5E7EB', fontSize: 13, fontWeight: '600' }}>{languagePair.split(' ↔ ')[0]}</Text>
                <MaterialIcons name="swap-horiz" size={18} color="#9CA3AF" style={{ marginHorizontal: 6 }} />
                <Text style={{ color: '#E5E7EB', fontSize: 13, fontWeight: '600' }}>{languagePair.split(' ↔ ')[1]}</Text>
              </TouchableOpacity>

              {/* Right: Keyboard/Close */}
              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: '#1F2937', borderColor: '#374151' }]} onPress={() => setIsVoiceMode(false)}>
                <MaterialIcons name="keyboard" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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

  // SUGGESTIONS
  suggestionsContainer: {
    marginBottom: 24,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
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
    backgroundColor: colors.backgroundElement,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
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
});
