import { genkit, z, Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Google model - stable for analysis
const GOOGLE_MODEL_NAME = 'googleai/gemini-2.0-flash';

let instancesCache: { instance: Genkit; model: string }[] | null = null;

/**
 * Robustly initialize exactly 2 Gemini AI instances for cycling.
 * This ensures quota limits are shared across two keys.
 */
export function getAiInstances(): { instance: Genkit; model: string }[] {
  if (instancesCache) return instancesCache;

  const instances: { instance: Genkit; model: string }[] = [];

  // Define exactly 2 Gemini keys as requested for fresh credits
  const googleKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
  ].filter(Boolean) as string[];

  console.log(`[Genkit] Initializing with ${googleKeys.length} Gemini API keys...`);

  for (const key of googleKeys) {
    try {
      const ai = genkit({ 
        plugins: [googleAI({ apiKey: key })] 
      });
      instances.push({ instance: ai, model: GOOGLE_MODEL_NAME });
    } catch (e) {
      console.error('[Genkit] Failed to initialize Google AI instance:', e);
    }
  }

  // Last resort fallback if no keys are found in environment
  if (instances.length === 0) {
    console.warn('[Genkit] No GEMINI_API_KEY found in environment. Using default instance.');
    const defaultInstance = genkit({ plugins: [googleAI()] });
    instances.push({ instance: defaultInstance, model: GOOGLE_MODEL_NAME });
  }

  instancesCache = instances;
  return instances;
}

export function getAi() {
  return getAiInstances()[0].instance;
}

export function defineMultiPrompt<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(options: any) {
  const instances = getAiInstances();
  return instances.map((item) =>
    item.instance.definePrompt({
      ...options,
      model: item.model,
    })
  );
}

if (typeof window === 'undefined') {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Fatal] Unhandled Rejection at:', promise, 'reason:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[Fatal] Uncaught Exception thrown:', err);
  });
}