import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility to retry an async function with exponential backoff and instance rotation.
 * Optimized for speed: tries all available instances IMMEDIATELY before sleeping.
 * 
 * @param fn - A function that receives the current attempt index (for rotation) and returns a promise.
 * @param maxRetries - Maximum number of full-cycle retries.
 * @param initialDelay - Initial delay for backoff in milliseconds.
 * @param availableInstancesCount - Number of available API key instances to rotate through.
 */
export async function retryWithBackoff<T>(
  fn: (instanceIndex: number) => Promise<T>,
  maxRetries: number = 8,
  initialDelay: number = 500,
  availableInstancesCount: number = 1
): Promise<T> {
  let retries = 0;
  // Start with a random instance
  let currentInstanceIndex = availableInstancesCount > 1 
    ? Math.floor(Math.random() * availableInstancesCount) 
    : 0;

  // Track which instances we've tried in the current "burst" cycle
  let triedInCurrentCycle = new Set<number>();

  while (retries < maxRetries) {
    try {
      return await fn(currentInstanceIndex);
    } catch (error: any) {
      const errorMessage = String(error?.message || error?.statusText || "").toUpperCase();
      const statusCode = error?.status || error?.code || (error?.response?.status);
      
      const isRateLimit = 
        statusCode === 429 ||
        errorMessage.includes('429') || 
        errorMessage.includes('RESOURCE_EXHAUSTED') || 
        errorMessage.includes('LIMIT');

      if (isRateLimit) {
        triedInCurrentCycle.add(currentInstanceIndex);

        // OPTIMIZATION: If we have other keys we haven't tried yet in this cycle, 
        // switch and retry IMMEDIATELY without waiting.
        if (triedInCurrentCycle.size < availableInstancesCount) {
          currentInstanceIndex = (currentInstanceIndex + 1) % availableInstancesCount;
          continue; 
        }

        // If ALL keys have been tried and all are rate-limited, now we must wait.
        const retryAfterMatch = String(error?.message).match(/retry in ([\d.]+)s/i);
        const retryAfterMs = retryAfterMatch
          ? parseFloat(retryAfterMatch[1]) * 1000
          : null;

        // Determine wait time: use Google's suggestion or fallback to exponential backoff
        const waitMs = retryAfterMs ?? (initialDelay * Math.pow(2, retries) + Math.random() * 300);

        if (typeof window === 'undefined') {
          console.warn(`[Quota] All ${availableInstancesCount} keys exhausted. Waiting ${Math.round(waitMs)}ms...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, waitMs));
        
        // Reset the cycle for the next attempt
        triedInCurrentCycle.clear();
        retries++;
        
        // Rotate to start the next cycle from a different key
        currentInstanceIndex = (currentInstanceIndex + 1) % availableInstancesCount;
        continue;
      }
      
      throw error;
    }
  }
  throw new Error("Maximum retries reached. All API instances are currently at capacity.");
}
