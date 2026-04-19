'use server';
/**
 * @fileOverview A Genkit flow for translating complex legal clauses into plain English.
 *
 * - translateLegalClause - A function that handles the translation process.
 * - TranslateLegalClauseInput - The input type for the translateLegalClause function.
 * - TranslateLegalClauseOutput - The return type for the translateLegalClause function.
 */

import { getAi, getAiInstances, defineMultiPrompt } from '@/ai/genkit';
import { z } from 'genkit';
import { retryWithBackoff } from '@/lib/utils';

const TranslateLegalClauseInputSchema = z.object({
  clauseText: z.string().describe('The legal clause text to be translated.'),
});
export type TranslateLegalClauseInput = z.infer<typeof TranslateLegalClauseInputSchema>;

const TranslateLegalClauseOutputSchema = z.object({
  plainEnglish: z.string().describe('The plain English translation of the legal clause.'),
});
export type TranslateLegalClauseOutput = z.infer<typeof TranslateLegalClauseOutputSchema>;

export async function translateLegalClause(input: TranslateLegalClauseInput): Promise<TranslateLegalClauseOutput> {
  try {
    console.log("[Server Action] Starting translateLegalClause...");
    const output = await translateLegalClauseFlow(input);
    return JSON.parse(JSON.stringify(output));
  } catch (error: any) {
    console.error("[Server Action Error] translateLegalClause failed:", error);
    throw error;
  }
}

const translateLegalClausePrompts = defineMultiPrompt({
  name: 'translateLegalClausePrompt',
  input: { schema: TranslateLegalClauseInputSchema },
  output: { schema: TranslateLegalClauseOutputSchema },
  prompt: ({ clauseText }: TranslateLegalClauseInput) => `You are an expert legal analyst and translator. Your task is to translate the provided legal clause into plain, clear, and concise English while maintaining its original legal intent. The translation should be easily understandable by a non-expert, akin to something a smart 16-year-old could comprehend. 

If the provided text contains multiple clauses or sections, preserve that structure in your translation using paragraph breaks or bullet points.

Provide only the plain English translation, formatted as JSON.

Legal Clause: ${clauseText}`,
});

const translateLegalClauseFlow = getAi().defineFlow(
  {
    name: 'translateLegalClauseFlow',
    inputSchema: TranslateLegalClauseInputSchema,
    outputSchema: TranslateLegalClauseOutputSchema,
  },
  async (input: TranslateLegalClauseInput) => {
    const instances = getAiInstances();
    const instancesCount = instances.length;
    const promptsCount = translateLegalClausePrompts.length;

    if (promptsCount === 0) {
      throw new Error("No AI instances available for translation.");
    }

    const { output } = await retryWithBackoff(
      async (index) => {
        const safeIndex = index % promptsCount;
        const promptFn = translateLegalClausePrompts[safeIndex];
        return await promptFn(input);
      },
      3, 
      1000,
      instancesCount
    );
    
    if (!output) throw new Error('AI returned an empty translation response.');
    return output;
  }
);
