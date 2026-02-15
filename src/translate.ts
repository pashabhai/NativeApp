import bhashini from 'bhashini-translation';

let isBhashiniConfigured = false;

function configureBhashiniAuth() {
  if (isBhashiniConfigured) {
    return;
  }

  const userId = process.env.EXPO_PUBLIC_BHASHINI_USER_ID;
  const ulcaApiKey = process.env.EXPO_PUBLIC_BHASHINI_ULCA_API_KEY;
  const inferenceApiKey = process.env.EXPO_PUBLIC_BHASHINI_INFERENCE_API_KEY;

  if (!userId || !ulcaApiKey || !inferenceApiKey) {
    throw new Error(
      'Missing Bhashini credentials. Set EXPO_PUBLIC_BHASHINI_USER_ID, EXPO_PUBLIC_BHASHINI_ULCA_API_KEY, and EXPO_PUBLIC_BHASHINI_INFERENCE_API_KEY.',
    );
  }

  bhashini.auth(userId, ulcaApiKey, inferenceApiKey);
  isBhashiniConfigured = true;
}

export async function translateToMarathi(input: string): Promise<string> {
  configureBhashiniAuth();
  const translated = await bhashini.nmt('en', 'mr', input);
  if (!translated || typeof translated !== 'string' || !translated.trim()) {
    throw new Error('Bhashini returned an empty translation.');
  }
  return translated.trim();
}
