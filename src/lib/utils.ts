import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility to retry an async function with exponential backoff.
 * 
 * @param fn - A function that receives the current attempt index and returns a promise.
 * @param maxRetries - Maximum number of retries.
 * @param initialDelay - Initial delay for backoff in milliseconds.
 * @param availableInstancesCount - Number of available instances.
 */
export async function retryWithBackoff<T>(
  fn: (instanceIndex: number) => Promise<T>,
  maxRetries: number = 8,
  initialDelay: number = 500,
  availableInstancesCount: number = 1
): Promise<T> {
  let retries = 0;
  // Start with a random instance index when multiple instances exist.
  let currentInstanceIndex = availableInstancesCount > 1 
    ? Math.floor(Math.random() * availableInstancesCount) 
    : 0;

  // Track which instances we've tried in the current burst cycle.
  let triedInCurrentCycle = new Set<number>();

  while (retries < maxRetries) {
    try {
      return await fn(currentInstanceIndex);
    } catch (error: any) {
      const errorMessage = String(error?.message || error?.statusText || error || "").toUpperCase();
      const statusCode = error?.status || error?.code || (error?.response?.status);
      
      const isRateLimit = 
        statusCode === 429 ||
        errorMessage.includes('429') || 
        errorMessage.includes('RESOURCE_EXHAUSTED') || 
        errorMessage.includes('LIMIT') ||
        errorMessage.includes('QUOTA');

      if (isRateLimit) {
        triedInCurrentCycle.add(currentInstanceIndex);

        // If we have other instances we haven't tried yet in this cycle,
        // switch and retry immediately without waiting.
        if (triedInCurrentCycle.size < availableInstancesCount) {
          if (typeof window === 'undefined') {
            console.log(`[Quota] Instance ${currentInstanceIndex} exhausted. Rotating to next instance...`);
          }
          currentInstanceIndex = (currentInstanceIndex + 1) % availableInstancesCount;
          continue; 
        }

        // If all instances have been tried and all are rate-limited, now we must wait.
        const retryAfterMatch = String(error?.message).match(/retry in ([\d.]+)s/i);
        const retryAfterMs = retryAfterMatch
          ? parseFloat(retryAfterMatch[1]) * 1000
          : null;

        // Determine wait time from the error hint or fall back to exponential backoff.
        // The fallback wait is shorter to prevent server action timeouts.
        const waitMs = retryAfterMs ?? (initialDelay * Math.pow(1.5, retries) + Math.random() * 200);

        if (typeof window === 'undefined') {
          console.warn(`[Quota] All ${availableInstancesCount} instances exhausted. Waiting ${Math.round(waitMs)}ms before retry ${retries + 1}/${maxRetries}...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, waitMs));
        
        // Reset the cycle for the next attempt.
        triedInCurrentCycle.clear();
        retries++;
        
        // Rotate to start the next cycle from a different instance.
        currentInstanceIndex = (currentInstanceIndex + 1) % availableInstancesCount;
        continue;
      }
      
      // For non-rate-limit errors, log them and throw
      if (typeof window === 'undefined') {
        console.error(`[AI Error] Instance ${currentInstanceIndex} failed with non-quota error:`, error);
      }
      throw error;
    }
  }
  throw new Error("Maximum retries reached. All API instances are currently at capacity.");
}
