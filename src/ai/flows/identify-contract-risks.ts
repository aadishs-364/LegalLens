'use server';
/**
 * @fileOverview A Genkit flow for identifying and categorizing legal risks in a contract clause,
 * including a glossary of complex legal terms and specific legal obligations.
 *
 * - identifyContractRisks - A function that handles the process of analyzing a contract clause for risks.
 * - IdentifyContractRisksInput - The input type for the identifyContractRisks function.
 * - IdentifyContractRisksOutput - The return type for the identifyContractRisks function.
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
  prompt: `You are ClearClause, an expert legal translator. Your task is to analyze contract text and return a structured JSON response.

CRITICAL INSTRUCTIONS FOR 'plainEnglish':
1. Translate the 'contractClause' into clear plain English.
2. YOU MUST MIRROR THE EXACT STRUCTURE of the original text. 
3. Use double newlines (\\n\\n) to separate distinct paragraphs, clauses, or numbered points. 
4. DO NOT group multiple distinct legal clauses into a single giant paragraph.

Instructions for Glossary (CORE DIFFERENTIATOR):
1. Identify specific, complex legal terms and distinct legal OBLIGATIONS (e.g., "Indemnify", "Force Majeure", "Arbitration").
2. PROVIDE A CLEAR, ACTION-ORIENTED MEANING FOR EACH. Focus on the real-world consequence for the user.
3. CRITICAL STRESS TEST: If a block of text contains multiple distinct obligations joined together (e.g., "Indemnify, Defend, and Hold Harmless"), you MUST break them down as separate items in the glossary.
   - "Indemnify" -> Pay for damages or losses.
   - "Defend" -> Cover legal costs and provide/pay for a lawyer.
   - "Hold harmless" -> Protect from being held legally responsible or sued.
4. Don't just define the word; explain the burden it places on the signer.

Instructions for Risks:
1. Identify risks and categorize them ONLY as: Financial, Legal Liability, Operational, Privacy, or Non-Compete.
2. Use the field name 'riskFactor' for the title.
3. For each risk, include the 'originalFragment' of text it refers to.

Contract Clause: {{{contractClause}}}`,
});

const identifyContractRisksFlow = ai.defineFlow(
  {
    name: 'identifyContractRisksFlow',
    inputSchema: IdentifyContractRisksInputSchema,
    outputSchema: IdentifyContractRisksOutputSchema,
  },
  async (input) => {
    // Aggressive retry logic with rotation
    const { output } = await retryWithBackoff(
      async (index) => identifyContractRisksPrompts[index](input),
      5,
      3000,
      allAis.length
    );
    
    if (!output) {
      throw new Error('Failed to get a valid response from the LLM.');
    }
    return output;
  }
);
