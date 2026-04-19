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

### CRITICAL CATEGORIZATION RULES:
1. **SCOPE vs. LIABILITY (The Root Cause Rule)**:
   - **Scope category** MUST be used whenever the risk is about the *breadth*, *vagueness*, *extensiveness*, or *open-endedness* of an obligation. 
   - **IMPORTANT TRAP**: If the text says "Broad Scope of Liability" or "Liability for any and all matters," the category is **Scope**, NOT Legal Liability. The "Scope" is the problem; "Liability" is just the context.
   
2. **MULTI-RISK DETECTION (FORCE SEPARATION)**: 
   - Analyze the text at a sentence level. 
   - You MUST return a separate risk object for EACH distinct legal concern, even if they appear in the same sentence. Never bundle multiple risks into one card.

3. **THE 100/100 IRREVOCABLE TRIGGER**:
   - If the text contains the word 'irrevocably' or 'irrevocable', you MUST generate a DEDICATED risk card titled "Permanent & Irreversible Rights Transfer".
   - The primary focus of this card MUST be the word 'irrevocably' itself and its legal permanence. 
   - DO NOT bundle this into a general 'Intellectual Property' or 'Assignment' card. It requires its own dedicated spotlight card.

4. **SEVERITY THRESHOLDS**:
   - Mark severity as **Critical** if the clause permanently transfers rights, has no time limit, applies outside of working hours without compensation, or contains 'irrevocable' waivers.

5. **GLOSSARY & OBLIGATIONS**:
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
    const { output } = await retryWithBackoff(
      async (index) => identifyContractRisksPrompts[index](input),
      8, // More retries to handle free tier limits
      2000,
      allAis.length
    );
    
    if (!output) {
      throw new Error('No response from AI.');
    }
    return output;
  }
);
