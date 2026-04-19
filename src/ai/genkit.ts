import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Detect available API keys from environment variables.
 * Supports both GOOGLE_GENAI_API_KEY and GEMINI_API_KEY prefixes (1-5).
 */
const keys = Array.from(new Set([
  process.env.GOOGLE_GENAI_API_KEY,
  process.env.GOOGLE_GENAI_API_KEY_2,
  process.env.GOOGLE_GENAI_API_KEY_3,
  process.env.GOOGLE_GENAI_API_KEY_4,
  process.env.GOOGLE_GENAI_API_KEY_5,
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
])).filter(Boolean) as string[];

// Diagnostic log (server-side only)
if (typeof window === 'undefined') {
  console.log(`[Genkit Init] Detected ${keys.length} unique API key(s) for rotation.`);
  if (keys.length === 0) {
    console.warn('[Genkit Init] No API keys found in environment. Please check your .env file.');
  }
}

/**
 * Initialize a pool of Genkit instances using the stable googleAI plugin.
 */
export const allAis = keys.length > 0
  ? keys.map(key =>
      genkit({
        plugins: [googleAI({ apiKey: key })],
      })
    )
  : [
      genkit({
        plugins: [googleAI()],
      }),
    ];

/**
 * Primary AI instance
 */
export const ai = allAis[0];

/**
 * Helper to define a prompt across all AI instances.
 * Using the explicit 'googleai/gemini-1.5-flash' identifier ensures stable routing.
 */
export function defineMultiPrompt<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(options: any) {
  return allAis.map((instance) =>
    instance.definePrompt({
      ...options,
      model: 'googleai/gemini-1.5-flash',
    })
  );
}
