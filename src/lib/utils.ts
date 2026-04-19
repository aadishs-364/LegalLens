import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility to retry an async function with exponential backoff and instance rotation.
 * Optimized to stay under the 30-second Server Action timeout.
 * 
 * @param fn - A function that receives the current attempt index (for rotation) and returns a promise.
 * @param maxRetries - Maximum number of retries (default 5 for better coverage with many keys).
 * @param initialDelay - Initial delay for backoff in milliseconds (default 1500ms).
 * @param availableInstancesCount - Number of available API key instances to rotate through.
 */
export async function retryWithBackoff<T>(
  fn: (instanceIndex: number) => Promise<T>,
  maxRetries: number = 5,
  initialDelay: number = 1500,
  availableInstancesCount: number = 1
): Promise<T> {
  let retries = 0;
  // Start with a random instance to distribute load if multiple keys are present
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
        errorMessage.includes('TOO MANY REQUESTS') ||
        errorMessage.includes('QUOTA');

      if (isRateLimit && retries < maxRetries) {
        // Rotate to the next instance/key immediately on rate limit
        if (availableInstancesCount > 1) {
          const previousIndex = currentInstanceIndex;
          currentInstanceIndex = (currentInstanceIndex + 1) % availableInstancesCount;
          
          if (typeof window === 'undefined') {
            console.log(`[Retry] Rotating key from #${previousIndex + 1} to #${currentInstanceIndex + 1} due to rate limit.`);
          }
        }
        
        // Use a slightly shorter backoff when we have many keys to rotate through
        const backoffFactor = availableInstancesCount > 3 ? 1.5 : 2;
        const delay = initialDelay * Math.pow(backoffFactor, retries) + Math.random() * 500;
        
        if (typeof window === 'undefined') {
          console.warn(
            `Rate limit encountered. Retrying in ${Math.round(delay)}ms... ` +
            `(Attempt ${retries + 1}/${maxRetries})`
          );
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        continue;
      }
      
      throw error;
    }
  }
}
