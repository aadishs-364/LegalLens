import { genkit, z, Genkit } from 'genkit';
import { anthropic } from '@genkit-ai/anthropic';

const ANTHROPIC_MODEL = anthropic.model('claude-sonnet-4-6');

let instanceCache: { instance: Genkit; model: any } | null = null;

/**
 * Initialize a single Anthropic AI instance.
 */
export function getAiInstances(): { instance: Genkit; model: any }[] {
  if (instanceCache) return [instanceCache];

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    console.warn('[Genkit] No ANTHROPIC_API_KEY found in environment. Using default instance.');
    instanceCache = {
      instance: genkit({ plugins: [anthropic()], model: ANTHROPIC_MODEL }),
      model: ANTHROPIC_MODEL,
    };
    return [instanceCache];
  }

  try {
    instanceCache = {
      instance: genkit({ plugins: [anthropic({ apiKey: anthropicKey })], model: ANTHROPIC_MODEL }),
      model: ANTHROPIC_MODEL,
    };
  } catch (error) {
    console.error('[Genkit] Failed to initialize Anthropic AI instance:', error);
    instanceCache = {
      instance: genkit({ plugins: [anthropic()], model: ANTHROPIC_MODEL }),
      model: ANTHROPIC_MODEL,
    };
  }

  return [instanceCache];
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