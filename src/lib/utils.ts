import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility to retry an async function with exponential backoff and instance rotation.
 * Optimized for speed and respects Google's "retry in" instructions.
 * 
 * @param fn - A function that receives the current attempt index (for rotation) and returns a promise.
 * @param maxRetries - Maximum number of retries.
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

  while (true) {
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

      if (isRateLimit && retries < maxRetries) {
        // Parse "retry in X.Xs" from the error message
        const retryAfterMatch = String(error?.message).match(/retry in ([\d.]+)s/i);
        const retryAfterMs = retryAfterMatch
          ? parseFloat(retryAfterMatch[1]) * 1000
          : null;

        // Determine wait time: use Google's suggestion or fallback to exponential backoff
        const waitMs = retryAfterMs ?? (initialDelay * Math.pow(2, retries) + Math.random() * 300);

        if (availableInstancesCount > 1) {
          const previousIndex = currentInstanceIndex;
          currentInstanceIndex = (currentInstanceIndex + 1) % availableInstancesCount;
          
          if (typeof window === 'undefined') {
            console.log(`[Rate-Limit] Key #${previousIndex + 1} exhausted. Waiting ${Math.round(waitMs)}ms and switching to Key #${currentInstanceIndex + 1}.`);
          }
        } else {
          if (typeof window === 'undefined') {
            console.warn(`[Retry] Quota hit. Waiting ${Math.round(waitMs)}ms before retry ${retries + 1}.`);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, waitMs));
        retries++;
        continue;
      }
      
      throw error;
    }
  }
}
