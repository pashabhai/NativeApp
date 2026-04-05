type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type GeminiErrorResponse = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

async function callGeminiGenerateContent(
  apiKey: string,
  model: string,
  input: string,
  forceRefresh = false,
): Promise<GeminiResponse> {
  const refreshNonce = forceRefresh ? `\nRefresh nonce: ${Date.now()}` : '';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: [
                  `i want to remember the marathi meaning of "${input}",  combining "marathi memory hook" method and etymology family word method in a `,
                  'Limit the response to 5 - 6 sentences ( do not mention techniques used). start first sentence with marathi word for "${input}" is, start second sentence with "To remember"',
                ].join('\n') + refreshNonce,
              },
            ],
          },
        ],
        generationConfig: { temperature: forceRefresh ? 0.6 : 0 },
      }),
    },
  );

  if (!response.ok) {
    let message = `Gemini translation failed (${response.status}).`;
    try {
      const errorData = (await response.json()) as GeminiErrorResponse;
      if (errorData.error?.message) {
        message = `Gemini translation failed (${response.status}): ${errorData.error.message}`;
      }
    } catch {
      // Keep generic message if error body parsing fails.
    }
    throw new Error(message);
  }

  return (await response.json()) as GeminiResponse;
}

export async function translateToMarathi(input: string, forceRefresh = false): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Gemini key. Set EXPO_PUBLIC_GEMINI_API_KEY.');
  }
  const model = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-1.5-flash';
  const data = await callGeminiGenerateContent(apiKey, model, input, forceRefresh);

  const translated = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!translated) {
    throw new Error('Empty translation received from Gemini.');
  }

  return translated;
}
