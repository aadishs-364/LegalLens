'use server';
/**
 * @fileOverview A Genkit flow for identifying and categorizing legal risks in a contract clause.
 */

import { ai, allAis, defineMultiPrompt } from '@/ai/genkit';
import { z } from 'genkit';
import { retryWithBackoff } from '@/lib/utils';

const IdentifyContractRisksInputSchema = z.object({
  contractClause: z
    .string()
    .min(50)
    .max(10000)
    .describe('The legal contract text or clause to analyze.'),
});
export type IdentifyContractRisksInput = z.infer<typeof IdentifyContractRisksInputSchema>;

const RiskSchema = z.object({
  riskFactor: z.string().describe('A concise title for the identified risk.'),
  category: z
    .enum([
      'Financial',
      'Legal Liability',
      'Operational',
      'Privacy',
      'Non-Compete',
      'Scope',
    ])
    .describe('The category of the risk.'),
  explanation: z
    .string()
    .describe('Explanation of why this risk matters in plain English.'),
  severity: z
    .enum(['Low', 'Medium', 'High', 'Critical'])
    .describe('The severity level of the risk.'),
  originalFragment: z.string().describe('The specific fragment of the contract this risk refers to.'),
});

const GlossaryItemSchema = z.object({
  term: z.string().describe('The complex legal term or obligation identified.'),
  meaning: z.string().describe('The plain English meaning, focused on what it actually requires the user to do.'),
});

const IdentifyContractRisksOutputSchema = z.object({
  isValidClause: z
    .boolean()
    .describe(
      'True if the input appears to be a valid contract clause or document, false otherwise.'
    ),
  plainEnglish: z
    .string()
    .describe('Full plain-language rewrite of the entire text, MUST use double newlines (\\n\\n) to separate paragraphs or clauses.'),
  summary: z.object({
    verdict: z
      .enum(['Low', 'Medium', 'High', 'Critical'])
      .describe('Overall risk verdict for the text.'),
    oneSentence: z.string().describe('A one-sentence overall risk summary.'),
  }),
  risks: z.array(RiskSchema).describe('An array of identified risks.'),
  glossary: z.array(GlossaryItemSchema).describe('A breakdown of complex legal terms and obligations found in the text.'),
});
export type IdentifyContractRisksOutput = z.infer<typeof IdentifyContractRisksOutputSchema>;

export type IdentifyContractRisksResult = 
  | { success: true; data: IdentifyContractRisksOutput }
  | { success: false; error: string };

export async function identifyContractRisks(
  input: IdentifyContractRisksInput
): Promise<IdentifyContractRisksResult> {
  try {
    const output = await identifyContractRisksFlow(input);
    return { success: true, data: output };
  } catch (error: any) {
    console.error("identifyContractRisks error:", error);
    return { 
      success: false, 
      error: error.message || "An unexpected error occurred during analysis. Please try again later." 
    };
  }
}

const identifyContractRisksPrompts = defineMultiPrompt({
  name: 'identifyContractRisksPrompt',
  input: { schema: IdentifyContractRisksInputSchema },
  output: { schema: IdentifyContractRisksOutputSchema },
  prompt: `You are ClearClause, an expert legal translator and risk analyst. Your task is to analyze contract text and return a structured JSON response.

### CRITICAL CATEGORIZATION RULES:
1. **SCOPE vs. LIABILITY**: Categorize as 'Scope' if the risk is about vagueness or open-endedness.
2. **MULTI-RISK DETECTION**: Return a separate risk object for EACH distinct legal concern.
3. **THE 100/100 IRREVOCABLE TRIGGER**: If 'irrevocably' or 'irrevocable' is used, create a DEDICATED risk card titled "Permanent & Irreversible Rights Transfer".
4. **SEVERITY**: Mark 'Critical' for permanent rights transfer, no time limits, or irrevocable waivers.
5. **GLOSSARY**: Breakdown compound obligations (e.g., "Indemnify, Defend, and Hold Harmless" -> 3 entries).

Contract Clause: """{{{contractClause}}}"""`,
});

const identifyContractRisksFlow = ai.defineFlow(
  {
    name: 'identifyContractRisksFlow',
    inputSchema: IdentifyContractRisksInputSchema,
    outputSchema: IdentifyContractRisksOutputSchema,
  },
  async (input) => {
    const { output } = await retryWithBackoff(
      async (index) => identifyContractRisksPrompts[index](input),
      5, 
      1000,
      allAis.length
    );
    
    if (!output) {
      throw new Error('No response from AI.');
    }
    return output;
  }
);