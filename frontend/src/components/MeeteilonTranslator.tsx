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
import { Colors } from '@/constants/theme';
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
            <Ionicons name="language" size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Meeteilon Translator</Text>
            <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
              English ⟷ Manipuri (Meetei Mayek ꯃꯤꯇꯩ ꯃꯌꯦꯛ)
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.directionBtn, { borderColor: colors.border, backgroundColor: inputBg }]}
          onPress={toggleDirection}
          activeOpacity={0.7}
        >
          <Text style={[styles.directionText, { color: colors.text }]}>
            {direction === 'en-mni' ? 'EN ➔ MNI' : 'MNI ➔ EN'}
          </Text>
          <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Input */}
      <View style={[styles.inputBox, { backgroundColor: inputBg, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={direction === 'en-mni' ? 'Type in English (e.g. How are you?)...' : 'Type in Manipuri Meetei Mayek...'}
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
        <View style={[styles.resultBox, { backgroundColor: isDark ? '#11221A' : '#F0FDF4', borderColor: colors.primary }]}>
          <View style={styles.resultHeader}>
            <Text style={[styles.resultLabel, { color: colors.primary }]}>
              {direction === 'en-mni' ? 'Manipuri (Meetei Mayek)' : 'English Translation'}
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>AI4Bharat IndicTrans2</Text>
            </View>
          </View>
          <Text style={[styles.resultText, { color: colors.text }]}>
            {translatedText}
          </Text>
        </View>
      ) : null}

      {errorMsg ? (
        <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
      ) : null}

      {/* 2-Person Conversation Mode Launcher */}
      <TouchableOpacity
        style={[styles.convBanner, { backgroundColor: isDark ? '#064E3B25' : '#ECFDF5', borderColor: '#0D948840' }]}
        onPress={() => router.push('/conversation')}
        activeOpacity={0.7}
      >
        <View style={styles.convBannerLeft}>
          <View style={[styles.convIconCircle, { backgroundColor: isDark ? '#0D948830' : '#CCFBF1' }]}>
            <Ionicons name="chatbubbles" size={17} color="#0D9488" />
          </View>
          <View style={styles.convTextCol}>
            <Text style={[styles.convBannerTitle, { color: colors.text }]}>
              Live Speech-to-Speech Translator 🎙️
            </Text>
            <Text style={[styles.convBannerSub, { color: colors.textSecondary }]}>
              Tourist (English) ⟷ Local (Meeteilon) Speech
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#0D9488" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 11,
    marginTop: 1,
  },
  directionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  directionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  clearBtn: {
    padding: 4,
    marginRight: 4,
  },
  translateBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  resultBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 6,
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
    backgroundColor: '#0F766E20',
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
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
  },
  convBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  convBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  convIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convTextCol: {
    flex: 1,
  },
  convBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  convBannerSub: {
    fontSize: 11,
    marginTop: 1,
  },
});
