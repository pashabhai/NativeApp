import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { autoCorrectEnglishText } from './src/autocorrect';
import {
  createNextVersionForRequest,
  deleteRecentRequest,
  getDefaultTargetLanguage,
  getRecentRequests,
  getRequestVersions,
  getSavedResponseForRequest,
  initDb,
  type RecentRequest,
  type RequestVersion,
  saveUserRequest,
} from './src/db';
import { translateToMarathi } from './src/translate';

export default function App() {
  const [manualText, setManualText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recents, setRecents] = useState<RecentRequest[]>([]);
  const [refreshingIds, setRefreshingIds] = useState<number[]>([]);
  const [learnedWords, setLearnedWords] = useState<string[]>([]);
  const [targetLanguageLabel, setTargetLanguageLabel] = useState('Target');
  const [openVersionsForRequest, setOpenVersionsForRequest] = useState<string | null>(null);
  const [versionsByRequest, setVersionsByRequest] = useState<Record<string, RequestVersion[]>>({});

  const effectiveInput = manualText.trim();

  const loadRecents = async () => {
    try {
      const rows = await getRecentRequests(8);
      setRecents(rows);
      const words = extractMarathiWords(rows.map((row) => row.response_text ?? ''));
      setLearnedWords(words);
    } catch (error) {
      console.warn('Failed to load recents from SQLite:', error);
    }
  };

  const extractMarathiWords = (texts: string[]): string[] => {
    const words = new Set<string>();
    for (const text of texts) {
      const matches = text.match(/[\u0900-\u097F]{2,}/g) ?? [];
      for (const word of matches) {
        words.add(word);
      }
    }
    return Array.from(words);
  };

  useEffect(() => {
    initDb()
      .then(async () => {
        await loadRecents();
        const targetLang = await getDefaultTargetLanguage();
        setTargetLanguageLabel(targetLang);
      })
      .catch((error) => {
        console.warn('SQLite init failed:', error);
      });
  }, []);

  const handlePasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      Alert.alert('Clipboard is empty', 'Copy some text from another app first.');
      return;
    }
    setManualText(text);
  };

  const handleTranslate = async () => {
    if (!effectiveInput) {
      Alert.alert('No text found', 'Paste text from clipboard first.');
      return;
    }

    try {
      setIsLoading(true);
      const correctedInput = autoCorrectEnglishText(effectiveInput);
      if (correctedInput !== effectiveInput) {
        setManualText(correctedInput);
      }
      const savedResponse = await getSavedResponseForRequest(correctedInput);
      if (savedResponse) {
        setTranslatedText(savedResponse);
        return;
      }
      const result = await translateToMarathi(correctedInput);
      setTranslatedText(result);
      try {
        await saveUserRequest(correctedInput, result);
        await loadRecents();
      } catch (saveError) {
        console.warn('Failed to save request in SQLite:', saveError);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not translate selected text.';
      Alert.alert('Translation failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshRecent = async (id: number, requestText: string) => {
    try {
      setRefreshingIds((prev) => [...prev, id]);
      const nextResponse = await translateToMarathi(requestText, true);
      await createNextVersionForRequest(requestText, nextResponse);
      await loadRecents();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to refresh recent item from Gemini.';
      Alert.alert('Refresh failed', message);
    } finally {
      setRefreshingIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  const handleToggleVersions = async (requestText: string, currentRowId: number) => {
    if (openVersionsForRequest === requestText) {
      setOpenVersionsForRequest(null);
      return;
    }

    try {
      const versions = await getRequestVersions(requestText);
      const previousVersions = versions.filter((row) => row.id !== currentRowId);
      setVersionsByRequest((prev) => ({ ...prev, [requestText]: previousVersions }));
      setOpenVersionsForRequest(requestText);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load versions.';
      Alert.alert('Versions failed', message);
    }
  };

  const hasMoreThanOneVersion = (version: string | null) => {
    const parsed = Number.parseFloat(version ?? '0');
    return Number.isFinite(parsed) && parsed > 1;
  };

  const handleDeleteRecent = (id: number) => {
    Alert.alert('Delete recent?', 'This will remove the item from Recents.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecentRequest(id);
            await loadRecents();
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Failed to delete recent item.';
            Alert.alert('Delete failed', message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Native App</Text>
        <Text style={styles.subtitle}>Remember words in your Native language.</Text>

        <View style={styles.selectionCard}>
          <Text style={styles.cardLabel}>Text from X/Kindle (Paste here)</Text>
          <View style={styles.pasteContainer}>
            <TextInput
              multiline
              value={manualText}
              onChangeText={setManualText}
              placeholder="Paste copied text..."
              style={styles.pasteInput}
              autoCorrect={false}
              spellCheck={false}
            />
            <Pressable style={styles.pasteIconButton} onPress={handlePasteFromClipboard}>
              <Image source={require('./assets/icons8-paste-48.png')} style={styles.pasteIconImage} />
            </Pressable>
          </View>
          <Text style={styles.hintText}>Auto-correct runs locally before translation.</Text>
        </View>

        <Pressable style={styles.button} onPress={handleTranslate}>
          <Text style={styles.buttonText}>Translate to Marathi</Text>
        </Pressable>

        <View style={styles.resultCard}>
          <Text style={styles.cardLabel}>Marathi Meaning</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#1f6f8b" />
          ) : (
            <Text style={styles.resultText}>{translatedText || 'Translation will appear here.'}</Text>
          )}
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.cardLabel}>Recents</Text>
          {recents.length === 0 ? (
            <Text style={styles.modelsText}>No recent requests yet.</Text>
          ) : (
            recents.map((item) => (
              <View key={item.id} style={styles.recentItem}>
                <View style={styles.recentHeaderRow}>
                  <Text style={styles.recentRequest}>{item.request_text}</Text>
                  <View style={styles.recentActions}>
                    <Pressable
                      style={styles.refreshIconButton}
                      onPress={() => handleRefreshRecent(item.id, item.request_text)}
                    >
                      {refreshingIds.includes(item.id) ? (
                        <ActivityIndicator size="small" color="#0f172a" />
                      ) : (
                        <Text style={styles.refreshIcon}>↻</Text>
                      )}
                    </Pressable>
                    <Pressable style={styles.deleteIconButton} onPress={() => handleDeleteRecent(item.id)}>
                      <Text style={styles.deleteIcon}>🗑</Text>
                    </Pressable>
                    {hasMoreThanOneVersion(item.version) ? (
                      <Pressable
                        style={styles.versionDropdownButton}
                        onPress={() => handleToggleVersions(item.request_text, item.id)}
                      >
                        <Text style={styles.versionDropdownText}>{`Versions v${item.version ?? '?'}`}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.recentResponse}>{item.response_text ?? ''}</Text>
                {openVersionsForRequest === item.request_text ? (
                  <View style={styles.versionsContainer}>
                    {(versionsByRequest[item.request_text] ?? []).length === 0 ? (
                      <Text style={styles.modelsText}>No previous versions.</Text>
                    ) : (
                      (versionsByRequest[item.request_text] ?? []).map((versionRow) => (
                        <View key={versionRow.id} style={styles.versionRow}>
                          <Text style={styles.versionRowText}>
                            {`v${versionRow.version ?? '?'}: ${versionRow.response_text ?? ''}`}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.cardLabel}>{`Learned ${targetLanguageLabel} Words`}</Text>
          {learnedWords.length === 0 ? (
            <Text style={styles.modelsText}>No learned words yet.</Text>
          ) : (
            <View style={styles.wordsWrap}>
              {learnedWords.map((word) => (
                <View key={word} style={styles.wordChip}>
                  <Text style={styles.wordChipText}>{word}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  content: {
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  selectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce2f0',
    padding: 12,
  },
  pasteInput: {
    width: '100%',
    minHeight: 72,
    borderWidth: 1,
    borderColor: '#dce2f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    paddingLeft: 46,
    textAlignVertical: 'top',
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  pasteContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  pasteIconButton: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 30,
    height: 30,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dce2f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasteIconImage: {
    width: 14,
    height: 14,
  },
  hintText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#1f6f8b',
    minHeight: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '66%',
    alignSelf: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce2f0',
    padding: 12,
    minHeight: 100,
  },
  resultText: {
    fontSize: 20,
    lineHeight: 30,
    color: '#0b1324',
  },
  modelsText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#0b1324',
  },
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshIcon: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteIcon: {
    fontSize: 12,
  },
  versionDropdownButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
  },
  versionDropdownText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  recentItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  recentRequest: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  recentResponse: {
    fontSize: 12,
    lineHeight: 18,
    color: '#334155',
  },
  versionsContainer: {
    marginTop: 6,
    gap: 4,
  },
  versionRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  versionRowText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#334155',
  },
  wordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  wordChipText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
});
