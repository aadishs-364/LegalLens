'use server';
/**
 * @fileOverview A Genkit flow for translating complex legal clauses into plain English.
 *
 * - translateLegalClause - A function that handles the translation process.
 * - TranslateLegalClauseInput - The input type for the translateLegalClause function.
 * - TranslateLegalClauseOutput - The return type for the translateLegalClause function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateLegalClauseInputSchema = z.object({
  clauseText: z.string().describe('The legal clause text to be translated.'),
});
export type TranslateLegalClauseInput = z.infer<typeof TranslateLegalClauseInputSchema>;

const TranslateLegalClauseOutputSchema = z.object({
  plainEnglish: z.string().describe('The plain English translation of the legal clause.'),
});
export type TranslateLegalClauseOutput = z.infer<typeof TranslateLegalClauseOutputSchema>;

export async function translateLegalClause(input: TranslateLegalClauseInput): Promise<TranslateLegalClauseOutput> {
  return translateLegalClauseFlow(input);
}

const translateLegalClausePrompt = ai.definePrompt({
  name: 'translateLegalClausePrompt',
  input: { schema: TranslateLegalClauseInputSchema },
  output: { schema: TranslateLegalClauseOutputSchema },
  prompt: `You are an expert legal analyst and translator. Your task is to translate the provided legal clause into plain, clear, and concise English while maintaining its original legal intent. The translation should be easily understandable by a non-expert, akin to something a smart 16-year-old could comprehend. 

If the provided text contains multiple clauses or sections, preserve that structure in your translation using paragraph breaks or bullet points.

Provide only the plain English translation, formatted as JSON.

Legal Clause: {{{clauseText}}}`,
});

const translateLegalClauseFlow = ai.defineFlow(
  {
    name: 'translateLegalClauseFlow',
    inputSchema: TranslateLegalClauseInputSchema,
    outputSchema: TranslateLegalClauseOutputSchema,
  },
  async (input) => {
    const { output } = await translateLegalClausePrompt(input);
    return output!;
  }
);
