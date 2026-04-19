import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Detect exactly 3 API keys for the rotation pool.
 */
const keys = Array.from(new Set([
  process.env.GOOGLE_GENAI_API_KEY,
  process.env.GOOGLE_GENAI_API_KEY_2,
  process.env.GOOGLE_GENAI_API_KEY_3,
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
])).filter(Boolean).slice(0, 3) as string[];

// Diagnostic log (server-side only)
if (typeof window === 'undefined') {
  console.log(`[Genkit Init] Running in 3-key stable mode. Detected ${keys.length} key(s).`);
}

/**
 * Initialize a pool of Genkit instances using the stable Google AI plugin.
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
 * Using 'googleai/gemini-1.5-flash' with the stable plugin ensures routing to the v1 endpoint.
 */
export function defineMultiPrompt<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(options: any) {
  return allAis.map((instance) =>
    instance.definePrompt({
      ...options,
      model: 'googleai/gemini-1.5-flash',
    })
  );
}
