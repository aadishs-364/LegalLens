import {genkit, z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

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

// Diagnostic log (visible in server terminal)
if (typeof window === 'undefined') {
  console.log(`[Genkit Init] Detected ${keys.length} unique API key(s) for rotation.`);
  if (keys.length === 0) {
    console.warn('[Genkit Init] No API keys found in environment. Please check your .env file.');
  } else {
    // Log masked keys for verification without exposing them
    keys.forEach((k, i) => {
      console.log(`[Genkit Init] Key #${i + 1}: ${k.substring(0, 6)}...${k.substring(k.length - 4)}`);
    });
  }
}

/**
 * Initialize a pool of Genkit instances, one for each API key.
 * If no keys are provided, it falls back to the default environment discovery.
 */
export const allAis = keys.length > 0 
  ? keys.map(key => genkit({
      plugins: [googleAI({ apiKey: key })],
      model: 'googleai/gemini-2.5-flash',
    }))
  : [genkit({
      plugins: [googleAI()],
      model: 'googleai/gemini-2.5-flash',
    })];

/**
 * Primary AI instance for general use (e.g., defining schemas).
 */
export const ai = allAis[0];

/**
 * Helper to define a prompt across all available AI instances for fallback support.
 */
export function defineMultiPrompt<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(options: any) {
  return allAis.map(instance => instance.definePrompt(options));
}
