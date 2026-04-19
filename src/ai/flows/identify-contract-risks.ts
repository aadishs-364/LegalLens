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
  prompt: `You are ClearClause, an expert legal translator. Your task is to analyze contract text and return a structured JSON response.

CRITICAL INSTRUCTIONS FOR MULTI-RISK DETECTION:
1. Analyze the text paragraph by paragraph.
2. A single paragraph or clause may contain MULTIPLE distinct risks. You MUST identify and list each one separately.
3. Pay close attention to 'Scope' risks: these are clauses that are vague, overly broad, or leave obligations open-ended (e.g., "any and all tasks assigned from time to time").

CRITICAL INSTRUCTIONS FOR 'plainEnglish':
1. Translate the 'contractClause' into clear plain English.
2. YOU MUST MIRROR THE EXACT STRUCTURE of the original text. 
3. Use double newlines (\\n\\n) to separate distinct paragraphs, clauses, or numbered points. 

Instructions for Risks:
1. Identify risks and categorize them ONLY as: Financial, Legal Liability, Operational, Privacy, Non-Compete, or Scope.
2. Use 'riskFactor' for the title and include 'originalFragment'.
3. 'Scope' risks specifically target vagueness or excessive breadth of responsibility.

Instructions for Glossary:
1. Identify specific, complex legal terms and distinct legal OBLIGATIONS.
2. PROVIDE A CLEAR, ACTION-ORIENTED MEANING FOR EACH.
3. Break down joined obligations (e.g., "Indemnify, Defend, and Hold Harmless") into separate items.

Contract Clause: {{{contractClause}}}`,
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