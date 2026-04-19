'use server';
/**
 * @fileOverview A flow to validate if the input text is a legal contract clause.
 *
 * - validateContractInput - A function that handles the contract input validation.
 * - ValidateContractInput - The input type for the validateContractInput function.
 * - ValidateContractInputOutput - The return type for the validateContractInput function.
 */

import { getAi, getAiInstances, defineMultiPrompt } from '@/ai/genkit';
import { z } from 'genkit';
import { retryWithBackoff } from '@/lib/utils';

const ValidateContractInputSchema = z.object({
  text: z.string().describe('The text to validate as a legal contract clause.'),
});
export type ValidateContractInput = z.infer<typeof ValidateContractInputSchema>;

const ValidateContractInputOutputSchema = z.object({
  isContract: z.boolean().describe('Whether the provided text is identified as a legal contract clause.'),
  message: z.string().describe('A message indicating the validation result.'),
});
export type ValidateContractInputOutput = z.infer<typeof ValidateContractInputOutputSchema>;

export async function validateContractInput(input: ValidateContractInput): Promise<ValidateContractInputOutput> {
  try {
    console.log("[Server Action] Starting validateContractInput...");
    const output = await validateContractInputFlow(input);
    return JSON.parse(JSON.stringify(output));
  } catch (error: any) {
    console.error("[Server Action Error] validateContractInput failed:", error);
    throw error;
  }
}

const validateContractInputPrompts = defineMultiPrompt({
  name: 'validateContractInputPrompt',
  input: { schema: ValidateContractInputSchema },
  output: { schema: ValidateContractInputOutputSchema },
  prompt: ({ text }: ValidateContractInput) => `You are an expert legal analyst. Your task is to determine if the provided text is a legal contract clause.

Return your response in the following JSON format ONLY, with no markdown or extra text outside the JSON block:

If the text is a legal contract clause, set "isContract" to true and provide a concise confirmation message in "message".
If the text is NOT a legal contract clause, set "isContract" to false and provide a concise message explaining that it does not appear to be a contract clause.

Text to analyze: ${text}`,
});

const validateContractInputFlow = getAi().defineFlow(
  {
    name: 'validateContractInputFlow',
    inputSchema: ValidateContractInputSchema,
    outputSchema: ValidateContractInputOutputSchema,
  },
  async (input: ValidateContractInput) => {
    const instances = getAiInstances();
    const instancesCount = instances.length;
    const promptsCount = validateContractInputPrompts.length;

    if (promptsCount === 0) {
      throw new Error("No AI instances available for validation.");
    }

    const { output } = await retryWithBackoff(
      async (index) => {
        const safeIndex = index % promptsCount;
        const promptFn = validateContractInputPrompts[safeIndex];
        return await promptFn(input);
      },
      3, 
      1000,
      instancesCount
    );
    
    if (!output) throw new Error('AI returned an empty validation response.');
    return output;
  }
);
