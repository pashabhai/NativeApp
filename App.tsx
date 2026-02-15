import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { autoCorrectEnglishText } from './src/autocorrect';
import { autoCorrectWithUITextChecker } from './src/iosAutocorrect';
import { translateToMarathi } from './src/translate';

export default function App() {
  const [manualText, setManualText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const effectiveInput = manualText.trim();

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
      let correctedInput = effectiveInput;
      try {
        const iosCorrected = await autoCorrectWithUITextChecker(effectiveInput);
        correctedInput = iosCorrected ?? autoCorrectEnglishText(effectiveInput);
      } catch {
        correctedInput = autoCorrectEnglishText(effectiveInput);
      }
      if (correctedInput !== effectiveInput) {
        setManualText(correctedInput);
      }
      const result = await translateToMarathi(correctedInput);
      setTranslatedText(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not translate selected text.';
      Alert.alert('Translation failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Paste + Marathi Translate</Text>
        <Text style={styles.subtitle}>Paste text from X/Kindle and translate.</Text>

        <View style={styles.selectionCard}>
          <Text style={styles.cardLabel}>Text from X/Kindle (Paste here)</Text>
          <TextInput
            multiline
            value={manualText}
            onChangeText={setManualText}
            placeholder="Paste copied text here from another app..."
            style={styles.pasteInput}
            autoCorrect={false}
            spellCheck={false}
          />
          <Pressable style={styles.secondaryButton} onPress={handlePasteFromClipboard}>
            <Text style={styles.secondaryButtonText}>Paste from Clipboard</Text>
          </Pressable>
          <Text style={styles.hintText}>
            Auto-correct: iOS UITextChecker first, local fallback otherwise.
          </Text>
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
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#dce2f0',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    marginBottom: 10,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  hintText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#1f6f8b',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
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
});
