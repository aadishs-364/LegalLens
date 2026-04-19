import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const DEFAULT_MODEL = 'googleai/gemini-2.0-flash'; // ✅ Updated model

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
])).filter(Boolean).slice(0, 5) as string[];

if (typeof window === 'undefined') {
  console.log(`[Genkit Init] Running in 5-key stable mode. Detected ${keys.length} key(s).`);
}

export const allAis = keys.length > 0
  ? keys.map(key =>
      genkit({
        plugins: [googleAI({ apiKey: key })],
      })
    )
  : [genkit({ plugins: [googleAI()] })];

export const ai = allAis[0];

export function defineMultiPrompt<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(options: any) {
  return allAis.map((instance) =>
    instance.definePrompt({
      ...options,
      model: DEFAULT_MODEL, // ✅ Uses updated model
    })
  );
}
