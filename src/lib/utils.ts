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
 * @param maxRetries - Maximum number of retries (default 3 to stay under timeout).
 * @param initialDelay - Initial delay for backoff in milliseconds (default 2000ms).
 * @param availableInstancesCount - Number of available API key instances to rotate through.
 */
export async function retryWithBackoff<T>(
  fn: (instanceIndex: number) => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000,
  availableInstancesCount: number = 1
): Promise<T> {
  let retries = 0;
  let currentInstanceIndex = 0;

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
        // Rotate to the next instance/key
        if (availableInstancesCount > 1) {
          currentInstanceIndex = (currentInstanceIndex + 1) % availableInstancesCount;
        }
        
        // Slightly tighter exponential backoff to ensure we stay under ~25s total
        const delay = initialDelay * Math.pow(2, retries) + Math.random() * 1000;
        
        if (typeof window === 'undefined') {
          console.warn(
            `Rate limit (429) encountered on server. Retrying in ${Math.round(delay)}ms... ` +
            `(Attempt ${retries + 1}/${maxRetries})` +
            (availableInstancesCount > 1 ? ` Switched to key #${currentInstanceIndex + 1}` : "")
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
