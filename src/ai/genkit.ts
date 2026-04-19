
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as genkitOpenAI from 'genkitx-openai';

const GOOGLE_MODEL = 'googleai/gemini-2.0-flash-lite';
const OPENROUTER_MODEL = 'openai/google/gemini-2.0-flash-lite:free';

// Detect all available keys (5 Google + 1 OpenRouter)
const googleKeys = Array.from(new Set([
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

const openRouterKey = process.env.OpenRouter_API_KEY;

if (typeof window === 'undefined') {
  console.log(`[Genkit Init] Cycling 6-key pool. Detected ${googleKeys.length} Google key(s) and ${openRouterKey ? '1' : '0'} OpenRouter key.`);
}

/**
 * Robustly resolve the openai plugin function from genkitx-openai
 */
const getOpenAIPlugin = () => {
  if (!genkitOpenAI) return null;
  // Try various export patterns to handle different bundling environments
  const plugin = (genkitOpenAI as any).openai || (genkitOpenAI as any).default?.openai || genkitOpenAI;
  return typeof plugin === 'function' ? plugin : null;
};

const openAIPlugin = getOpenAIPlugin();

// Create internal map of instances with their specific model identifiers
export const allAisWithModels = [
  ...googleKeys.map(key => ({
    instance: genkit({
      plugins: [googleAI({ apiKey: key })],
    }),
    model: GOOGLE_MODEL
  })),
  ...(openRouterKey && openAIPlugin ? [{
    instance: genkit({
      plugins: [openAIPlugin({ 
        apiKey: openRouterKey, 
        config: { baseURL: 'https://openrouter.ai/api/v1' } 
      })],
    }),
    model: OPENROUTER_MODEL
  }] : [])
];

// Fallback for initialization if no keys are found
if (allAisWithModels.length === 0) {
  allAisWithModels.push({
    instance: genkit({ plugins: [googleAI()] }),
    model: GOOGLE_MODEL
  });
}

// Export for existing logic that uses allAis directly
export const allAis = allAisWithModels.map(item => item.instance);

// Default instance
export const ai = allAis[0];

/**
 * Enhanced defineMultiPrompt that maps each Genkit instance to its correct provider model.
 */
export function defineMultiPrompt<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(options: any) {
  return allAisWithModels.map((item) =>
    item.instance.definePrompt({
      ...options,
      model: item.model,
    })
  );
}
