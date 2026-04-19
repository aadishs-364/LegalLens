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

export async function identifyContractRisks(
  input: IdentifyContractRisksInput
): Promise<IdentifyContractRisksOutput> {
  return identifyContractRisksFlow(input);
}

const identifyContractRisksPrompts = defineMultiPrompt({
  name: 'identifyContractRisksPrompt',
  input: { schema: IdentifyContractRisksInputSchema },
  output: { schema: IdentifyContractRisksOutputSchema },
  prompt: `You are ClearClause, an expert legal translator and risk analyst. Your task is to analyze contract text and return a structured JSON response.

### CRITICAL CATEGORIZATION RULES (DO NOT FAIL THESE):
1. **SCOPE vs. LIABILITY (The Root Cause Rule)**:
   - **Scope category** MUST be used whenever the risk is about the *breadth*, *vagueness*, *extensiveness*, or *open-endedness* of an obligation. 
   - **IMPORTANT TRAP**: If the text says "Broad Scope of Liability" or "Liability for any and all matters," the category is **Scope**, NOT Legal Liability. The "Scope" is the problem; "Liability" is just the context.
   - **Legal Liability category** is strictly for the *legal mechanisms* or *consequences* themselves (e.g., Indemnification requirements, damage waivers, liability caps, or "hold harmless" promises).
   
2. **MULTI-RISK DETECTION**: 
   - Analyze the text at a sentence level. 
   - A single paragraph often contains multiple distinct risks. You MUST list each one as a separate entry in the 'risks' array.

3. **GLOSSARY & OBLIGATIONS**:
   - Identify complex terms AND specific distinct obligations.
   - BREAK DOWN compound obligations. If a clause says "Indemnify, Defend, and Hold Harmless," provide THREE separate glossary entries explaining exactly what each one forces the user to do.

Contract Clause: """{{{contractClause}}}"""`,
});

const identifyContractRisksFlow = ai.defineFlow(
  {
    name: 'identifyContractRisksFlow',
    inputSchema: IdentifyContractRisksInputSchema,
    outputSchema: IdentifyContractRisksOutputSchema,
  },
  async (input) => {
    // Rotation logic across available API keys handled by retryWithBackoff
    const { output } = await retryWithBackoff(
      async (index) => identifyContractRisksPrompts[index](input),
      3,
      2000,
      allAis.length
    );
    
    if (!output) {
      throw new Error('No response from AI.');
    }
    return output;
  }
);
