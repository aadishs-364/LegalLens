'use server';
/**
 * @fileOverview A Genkit flow to explain a specific contract risk in detail.
 */

import { getAi, getAiInstances, defineMultiPrompt } from '@/ai/genkit';
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
    console.log("[Server Action] Starting explainRiskImplications analysis...");
    const output = await explainRiskImplicationsGenkitFlow(input);
    
    // Ensure serializable output
    const serializedData = JSON.parse(JSON.stringify(output));
    
    return { success: true, data: serializedData };
  } catch (error: any) {
    console.error("[Server Action Error] explainRiskImplications failed:", error);
    return { 
      success: false, 
      error: error.message || "Failed to generate detailed risk insights." 
    };
  }
}

const explainRiskImplicationsPrompts = defineMultiPrompt({
  name: 'explainRiskImplicationsPrompt',
  input: { schema: ExplainRiskImplicationsInputSchema },
  output: { schema: ExplainRiskImplicationsOutputSchema },
  prompt: ({ riskTitle, originalFragment, severity }: ExplainRiskImplicationsInput) => `You are a senior legal strategist. A contract clause has been flagged for a risk: "${riskTitle}".

Fragment: """${originalFragment}"""
Severity: ${severity}

Explain the following in simple, non-legal terms:
1. WHY this risk matters.
2. What could happen in a WORST-CASE real-world scenario.
3. A specific question to ask a lawyer about this.
4. If applicable, how a FAIRER version of this clause might look.`,
});

const explainRiskImplicationsGenkitFlow = getAi().defineFlow(
  {
    name: 'explainRiskImplicationsFlow',
    inputSchema: ExplainRiskImplicationsInputSchema,
    outputSchema: ExplainRiskImplicationsOutputSchema,
  },
  async (input: ExplainRiskImplicationsInput) => {
    const instances = getAiInstances();
    const instancesCount = instances.length;
    const promptsCount = explainRiskImplicationsPrompts.length;

    if (promptsCount === 0) {
      throw new Error("No AI instances available for risk explanation.");
    }

    const { output } = await retryWithBackoff(
      async (index) => {
        const safeIndex = index % promptsCount;
        const promptFn = explainRiskImplicationsPrompts[safeIndex];
        return await promptFn(input);
      },
      3, 
      1000,
      instancesCount
    );
    
    if (!output) throw new Error('AI returned an empty risk explanation.');
    return output;
  }
);
