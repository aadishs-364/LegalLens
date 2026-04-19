'use server';
/**
 * @fileOverview A Genkit flow to explain a specific contract risk in detail.
 */

import { ai, allAis, defineMultiPrompt } from '@/ai/genkit';
import { z } from 'genkit';
import { retryWithBackoff } from '@/lib/utils';

const ExplainRiskImplicationsInputSchema = z.object({
  riskTitle: z.string().describe('The title of the identified risk.'),
  originalFragment: z.string().describe('The fragment of the contract representing this risk.'),
  existingExplanation: z.string().optional().describe('Existing brief explanation.'),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('Severity level.'),
});
export type ExplainRiskImplicationsInput = z.infer<typeof ExplainRiskImplicationsInputSchema>;

const ExplainRiskImplicationsOutputSchema = z.object({
  detailedExplanation: z.string().describe('A plain English explanation of why this risk matters.'),
  realWorldImplications: z.string().describe('Description of potential real-world impact.'),
  lawyerTip: z.string().describe('Actionable question for a lawyer.'),
  fairerAlternative: z.string().optional().describe('Suggestion for fairer wording.'),
});
export type ExplainRiskImplicationsOutput = z.infer<typeof ExplainRiskImplicationsOutputSchema>;

export type ExplainRiskImplicationsResult = 
  | { success: true; data: ExplainRiskImplicationsOutput }
  | { success: false; error: string };

export async function explainRiskImplications(
  input: ExplainRiskImplicationsInput
): Promise<ExplainRiskImplicationsResult> {
  try {
    const output = await explainRiskImplicationsGenkitFlow(input);
    return { success: true, data: output };
  } catch (error: any) {
    console.error("explainRiskImplications error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to generate detailed risk insights." 
    };
  }
}

const explainRiskImplicationsPrompts = defineMultiPrompt({
  name: 'explainRiskImplicationsPrompt',
  input: {schema: ExplainRiskImplicationsInputSchema},
  output: {schema: ExplainRiskImplicationsOutputSchema},
  prompt: `You are an expert legal analyst. Provide a detailed, clear, and actionable explanation for a specific contract risk.

Risk Title: {{{riskTitle}}}
Original Fragment: """{{{originalFragment}}}"""
Severity: {{{severity}}}
{{#if existingExplanation}}Explanation Context: {{{existingExplanation}}}{{/if}}

Generate:
1. Plain English explanation of why it matters.
2. Real-world consequences.
3. A question for a lawyer.
4. A fairer alternative wording.`,
});

const explainRiskImplicationsGenkitFlow = ai.defineFlow(
  {
    name: 'explainRiskImplicationsFlow',
    inputSchema: ExplainRiskImplicationsInputSchema,
    outputSchema: ExplainRiskImplicationsOutputSchema,
  },
  async input => {
    const { output } = await retryWithBackoff(
      async (index) => explainRiskImplicationsPrompts[index](input),
      8,
      2000,
      allAis.length
    );

    if (!output) {
      throw new Error('Failed to generate risk implications.');
    }
    return output;
  }
);