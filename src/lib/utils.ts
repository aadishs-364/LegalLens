import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility to retry an async function with exponential backoff and instance rotation.
 * Optimized for speed when multiple keys are available.
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
        // FAST ROTATION: If we have other keys, switch immediately
        if (availableInstancesCount > 1) {
          const previousIndex = currentInstanceIndex;
          currentInstanceIndex = (currentInstanceIndex + 1) % availableInstancesCount;
          
          if (typeof window === 'undefined') {
            console.log(`[Fast-Rotate] Switching from Key #${previousIndex + 1} to Key #${currentInstanceIndex + 1} due to rate limit.`);
          }
          
          // Tiny jitter to avoid simultaneous hits
          await new Promise(resolve => setTimeout(resolve, 150));
          retries++;
          continue;
        }
        
        // SLOW BACKOFF: Only used if we have only one key
        const delay = initialDelay * Math.pow(2, retries) + Math.random() * 300;
        
        if (typeof window === 'undefined') {
          console.warn(`[Retry] Rate limit hit. Waiting ${Math.round(delay)}ms before retry ${retries + 1}.`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        continue;
      }
      
      throw error;
    }
  }
}
