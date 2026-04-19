import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility to retry an async function with exponential backoff and instance rotation.
 * Useful for handling "Resource Exhausted" (429) errors from AI APIs.
 * 
 * @param fn - A function that receives the current attempt index (for rotation) and returns a promise.
 * @param maxRetries - Maximum number of retries before giving up.
 * @param initialDelay - Initial delay for backoff in milliseconds.
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
      // Pass the current instance index to the caller so they can pick the right AI instance/key
      return await fn(currentInstanceIndex);
    } catch (error: any) {
      const errorMessage = error?.message || "";
      const isRateLimit = 
        errorMessage.includes('429') || 
        errorMessage.includes('RESOURCE_EXHAUSTED') || 
        errorMessage.includes('Too Many Requests');

      if (isRateLimit && retries < maxRetries) {
        // Rotate to the next instance/key if multiple are available
        currentInstanceIndex = (currentInstanceIndex + 1) % availableInstancesCount;
        
        // Exponential backoff with a bit of random jitter
        const delay = initialDelay * Math.pow(2, retries) + Math.random() * 1000;
        
        console.warn(
          `Rate limit hit. Rotating to key #${currentInstanceIndex + 1} and retrying in ${Math.round(delay)}ms... ` +
          `(Attempt ${retries + 1}/${maxRetries})`
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        continue;
      }
      throw error;
    }
  }
}
