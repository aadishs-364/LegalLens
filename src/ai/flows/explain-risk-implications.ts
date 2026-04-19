'use server';
/**
 * @fileOverview A Genkit flow to explain a specific contract risk in detail.
 *
 * - explainRiskImplications - A function that handles the detailed explanation of a contract risk.
 * - ExplainRiskImplicationsInput - The input type for the explainRiskImplications function.
 * - ExplainRiskImplicationsOutput - The return type for the explainRiskImplications function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { retryWithBackoff } from '@/lib/utils';

/**
 * @dev Input schema for the explainRiskImplications flow.
 */
const ExplainRiskImplicationsInputSchema = z.object({
  riskTitle: z.string().describe('The title or category of the identified risk (e.g., "Indemnification").'),
  originalFragment: z
    .string()
    .describe('The exact fragment of the contract text that contains or represents this risk.'),
  existingExplanation: z
    .string()
    .optional()
    .describe('An existing brief explanation of the risk, if available, to provide context.'),
  severity: z
    .enum(['Low', 'Medium', 'High', 'Critical'])
    .describe('The severity level of the risk, used to tailor the explanation detail.'),
});
export type ExplainRiskImplicationsInput = z.infer<typeof ExplainRiskImplicationsInputSchema>;

/**
 * @dev Output schema for the explainRiskImplications flow.
 */
const ExplainRiskImplicationsOutputSchema = z.object({
  detailedExplanation: z
    .string()
    .describe('A comprehensive, plain English explanation of why this specific risk matters.'),
  realWorldImplications: z
    .string()
    .describe('A clear description of the potential real-world impact and consequences for the user.'),
  lawyerTip: z.string().describe('A specific, actionable question the user should ask a lawyer regarding this risk.'),
  fairerAlternative: z
    .string()
    .optional()
    .describe(
      'A suggestion for a fairer alternative wording for the original contract fragment, if such an alternative exists and is appropriate.'
    ),
});
export type ExplainRiskImplicationsOutput = z.infer<
  typeof ExplainRiskImplicationsOutputSchema
>;

/**
 * A wrapper function to invoke the explainRiskImplicationsGenkitFlow.
 * @param input - The input containing risk details.
 * @returns A promise that resolves to the detailed risk explanation, implications, lawyer tip, and fairer alternative.
 */
export async function explainRiskImplications(
  input: ExplainRiskImplicationsInput
): Promise<ExplainRiskImplicationsOutput> {
  return explainRiskImplicationsGenkitFlow(input);
}

/**
 * Genkit prompt definition for explaining contract risks.
 * Instructs the LLM to act as an expert legal analyst and plain English translator.
 */
const explainRiskImplicationsPrompt = ai.definePrompt({
  name: 'explainRiskImplicationsPrompt',
  input: {schema: ExplainRiskImplicationsInputSchema},
  output: {schema: ExplainRiskImplicationsOutputSchema},
  prompt: `You are an expert legal analyst and plain English translator with extensive experience in making complex legal contracts understandable to everyday people.
Your task is to provide a detailed, clear, and actionable explanation for a specific contract risk.

Based on the following risk details, you must generate:
1. A comprehensive plain English explanation of why this risk matters.
2. Its potential real-world implications and consequences for a user.
3. A specific question a user should ask a lawyer regarding this risk.
4. Optionally, a suggestion for a fairer alternative wording for the original contract fragment.

Risk Title: {{{riskTitle}}}
Original Contract Fragment: """{{{originalFragment}}}"""
Severity: {{{severity}}}
{{#if existingExplanation}}
Existing Brief Explanation: {{{existingExplanation}}}
{{/if}}

Ensure your response is in strict JSON format, adhering precisely to the provided output schema, with no additional text or markdown outside the JSON block.
`,
});

/**
 * Genkit flow definition for explaining contract risks.
 * It uses the explainRiskImplicationsPrompt to generate the detailed risk analysis.
 */
const explainRiskImplicationsGenkitFlow = ai.defineFlow(
  {
    name: 'explainRiskImplicationsFlow',
    inputSchema: ExplainRiskImplicationsInputSchema,
    outputSchema: ExplainRiskImplicationsOutputSchema,
  },
  async input => {
    // Retry internally on the server to handle rate limits before returning to client
    const {output} = await retryWithBackoff(() => explainRiskImplicationsPrompt(input));
    if (!output) {
      throw new Error('Failed to generate risk implications: The LLM returned an empty response.');
    }
    return output;
  }
);
