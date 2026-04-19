import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

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
 * Helper to define a prompt across all AI instances with a fallback model strategy.
 * If Flash (index 0) fails or is restricted, the retry logic will rotate to 
 * Pro (index 1+) which is available globally.
 */
export function defineMultiPrompt<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(options: any) {
  return allAis.map((instance, index) =>
    instance.definePrompt({
      ...options,
      // Fallback strategy: Try flash first, use pro for all other rotated instances
      model: index === 0 ? 'gemini-1.5-flash' : 'gemini-1.5-pro',
    })
  );
}
