import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility to retry an async function with exponential backoff.
 * Useful for handling "Resource Exhausted" (429) errors from AI APIs.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const errorMessage = error?.message || "";
      const isRateLimit = 
        errorMessage.includes('429') || 
        errorMessage.includes('RESOURCE_EXHAUSTED') || 
        errorMessage.includes('Too Many Requests');

      if (isRateLimit && retries < maxRetries) {
        const delay = initialDelay * Math.pow(2, retries);
        console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        continue;
      }
      throw error;
    }
  }
}
