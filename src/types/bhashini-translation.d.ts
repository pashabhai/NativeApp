declare module 'bhashini-translation' {
  const bhashini: {
    auth: (userId: string, ulcaApiKey: string, inferenceApiKey: string) => void;
    nmt: (sourceLang: string, targetLang: string, sourceText: string) => Promise<string>;
  };

  export default bhashini;
}
