'use server';
/**
 * @fileOverview A Genkit flow for identifying and categorizing legal risks in a contract clause,
 * including a glossary of complex legal terms.
 *
 * - identifyContractRisks - A function that handles the process of analyzing a contract clause for risks.
 * - IdentifyContractRisksInput - The input type for the identifyContractRisks function.
 * - IdentifyContractRisksOutput - The return type for the identifyContractRisks function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
  term: z.string().describe('The complex legal term identified.'),
  meaning: z.string().describe('The plain English meaning of the term.'),
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
  glossary: z.array(GlossaryItemSchema).describe('A breakdown of complex legal terms found in the text.'),
});
export type IdentifyContractRisksOutput = z.infer<typeof IdentifyContractRisksOutputSchema>;

export async function identifyContractRisks(
  input: IdentifyContractRisksInput
): Promise<IdentifyContractRisksOutput> {
  return identifyContractRisksFlow(input);
}

const identifyContractRisksPrompt = ai.definePrompt({
  name: 'identifyContractRisksPrompt',
  input: { schema: IdentifyContractRisksInputSchema },
  output: { schema: IdentifyContractRisksOutputSchema },
  prompt: `You are ClearClause, an expert legal translator. Your task is to analyze contract text and return a structured JSON response.

CRITICAL INSTRUCTIONS FOR 'plainEnglish':
1. Translate the 'contractClause' into clear plain English.
2. YOU MUST MIRROR THE EXACT STRUCTURE of the original text. 
3. Use double newlines (\\n\\n) to separate distinct paragraphs, clauses, or numbered points.

Instructions for Glossary:
1. Identify specific, complex legal terms used in the text (e.g., "Indemnify", "Force Majeure", "Arbitration").
2. Provide a simple, clear meaning for each.
3. If a block of text contains multiple distinct obligations (e.g., "Indemnify, Defend, and Hold Harmless"), break them down as separate items in the glossary.

Instructions for Risks:
1. Identify risks and categorize them ONLY as: Financial, Legal Liability, Operational, Privacy, or Non-Compete.
2. For each risk, include the 'originalFragment' of text it refers to.

Contract Clause: {{{contractClause}}}`,
});

const identifyContractRisksFlow = ai.defineFlow(
  {
    name: 'identifyContractRisksFlow',
    inputSchema: IdentifyContractRisksInputSchema,
    outputSchema: IdentifyContractRisksOutputSchema,
  },
  async (input) => {
    const { output } = await identifyContractRisksPrompt(input);
    if (!output) {
      throw new Error('Failed to get a valid response from the LLM.');
    }
    return output;
  }
);
