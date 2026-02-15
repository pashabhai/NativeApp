import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { close, InitialProps, Text, View } from 'expo-share-extension';
import { translateToMarathi } from './src/translate';

export default function ShareExtension(props: InitialProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const sourceText = useMemo(() => {
    if (props.text?.trim()) {
      return props.text.trim();
    }
    if (props.url?.trim()) {
      return props.url.trim();
    }
    return '';
  }, [props.text, props.url]);

  const handleTranslate = async () => {
    if (!sourceText) {
      setErrorMessage('No text received from share sheet.');
      return;
    }

    try {
      setErrorMessage('');
      setIsLoading(true);
      const translated = await translateToMarathi(sourceText);
      setTranslatedText(translated);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Translation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text allowFontScaling={false} style={styles.title}>
        Translate to Marathi
      </Text>

      <Text allowFontScaling={false} style={styles.label}>
        Shared Text
      </Text>
      <Text allowFontScaling={false} style={styles.body}>
        {sourceText || 'No share payload found. Try sharing selected text.'}
      </Text>

      <Pressable style={styles.primaryButton} onPress={handleTranslate}>
        <Text allowFontScaling={false} style={styles.primaryButtonText}>
          Translate
        </Text>
      </Pressable>

      {isLoading ? (
        <ActivityIndicator size="small" color="#1f6f8b" />
      ) : (
        <>
          <Text allowFontScaling={false} style={styles.label}>
            Marathi Meaning
          </Text>
          <Text allowFontScaling={false} style={styles.result}>
            {translatedText || 'Translation will appear here.'}
          </Text>
        </>
      )}

      {errorMessage ? (
        <Text allowFontScaling={false} style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}

      <Pressable style={styles.secondaryButton} onPress={close}>
        <Text allowFontScaling={false} style={styles.secondaryButtonText}>
          Done
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0f172a',
  },
  result: {
    fontSize: 18,
    lineHeight: 26,
    color: '#0b1324',
    marginTop: 2,
  },
  error: {
    marginTop: 8,
    color: '#dc2626',
    fontSize: 13,
  },
  primaryButton: {
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#1f6f8b',
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
});
