import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { translateText } from '@/utils/meerupApi';

export function MeeteilonTranslator() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';

  const [inputText, setInputText] = useState('');
  const [direction, setDirection] = useState<'en-mni' | 'mni-en'>('en-mni');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTranslate = async (textToTranslate?: string) => {
    const query = (textToTranslate ?? inputText).trim();
    if (!query) return;

    setLoading(true);
    setErrorMsg(null);

    const sourceLang = direction === 'en-mni' ? 'en' : 'mni';
    const targetLang = direction === 'en-mni' ? 'mni' : 'en';

    try {
      const res = await translateText(query, sourceLang, targetLang, false);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.text) {
        setTranslatedText(res.text);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Translation failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleDirection = () => {
    setDirection(prev => (prev === 'en-mni' ? 'mni-en' : 'en-mni'));
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const cardBg = isDark ? colors.backgroundElement : '#FFFFFF';
  const inputBg = isDark ? colors.background : '#F8F9FB';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? '#14382B' : '#E6F4EA' }]}>
            <Ionicons name="language" size={17} color={colors.primary} />
          </View>
          <View style={styles.titleTextCol}>
            <Text style={[styles.title, { color: colors.text }]}>Meeteilon Translator</Text>
            <Text style={[styles.subTitle, { color: colors.textSecondary }]} numberOfLines={1}>
              English ⟷ Manipuri (ꯃꯤꯇꯩꯂꯣꯟ)
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.directionBtn, { borderColor: colors.border, backgroundColor: inputBg }]}
          onPress={toggleDirection}
          activeOpacity={0.7}
        >
          <Text style={[styles.directionText, { color: colors.text }]}>
            {direction === 'en-mni' ? 'EN → MNI' : 'MNI → EN'}
          </Text>
          <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Prominent Live Voice Translation Button */}
      <TouchableOpacity
        style={[
          styles.voiceBanner,
          {
            backgroundColor: isDark ? '#064E3B30' : '#ECFDF5',
            borderColor: isDark ? '#05966950' : '#A7F3D0',
          },
        ]}
        onPress={() => router.push('/conversation')}
        activeOpacity={0.8}
      >
        <View style={styles.voiceBannerLeft}>
          <View style={[styles.voiceMicCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="mic" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.voiceTextCol}>
            <Text style={[styles.voiceTitle, { color: colors.text }]}>
              Live Speech-to-Speech
            </Text>
            <Text style={[styles.voiceSub, { color: colors.textSecondary }]}>
              Speak in English or Manipuri to translate live
            </Text>
          </View>
        </View>
        <View style={[styles.voiceBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.voiceBadgeText}>Start</Text>
          <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Direct Text Translation Input */}
      <View style={[styles.inputBox, { backgroundColor: inputBg, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={
            direction === 'en-mni'
              ? 'Type in English (e.g. Where is the hotel?)...'
              : 'Type in Manipuri Meetei Mayek...'
          }
          placeholderTextColor={colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleTranslate()}
          returnKeyType="done"
        />
        {inputText.length > 0 && (
          <TouchableOpacity onPress={() => setInputText('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.translateBtn,
            { backgroundColor: inputText.trim() ? colors.primary : (isDark ? '#2A2C38' : '#E5E7EB') },
          ]}
          onPress={() => handleTranslate()}
          disabled={!inputText.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="arrow-forward"
              size={15}
              color={inputText.trim() ? '#FFFFFF' : colors.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Translation Result Output */}
      {translatedText ? (
        <View
          style={[
            styles.resultBox,
            { backgroundColor: isDark ? '#11221A' : '#F0FDF4', borderColor: colors.primary },
          ]}
        >
          <View style={styles.resultHeader}>
            <Text style={[styles.resultLabel, { color: colors.primary }]}>
              {direction === 'en-mni' ? 'Manipuri (Meetei Mayek)' : 'English Translation'}
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>IndicTrans2</Text>
            </View>
          </View>
          <Text style={[styles.resultText, { color: colors.text }]}>
            {translatedText}
          </Text>
        </View>
      ) : null}

      {errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  titleTextCol: {
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subTitle: {
    fontSize: 11,
    marginTop: 1,
  },
  directionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  directionText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Live Speech Banner
  voiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  voiceBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  voiceMicCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceTextCol: {
    flex: 1,
  },
  voiceTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  voiceSub: {
    fontSize: 11,
    marginTop: 2,
  },
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  voiceBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Text Input Box
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
  },
  clearBtn: {
    padding: 4,
    marginRight: 4,
  },
  translateBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Results
  resultBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: '#0F766E18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0F766E',
  },
  resultText: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 8,
    marginHorizontal: 4,
  },
});
