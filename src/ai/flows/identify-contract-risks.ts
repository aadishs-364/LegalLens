'use server';
/**
 * @fileOverview A Genkit flow for identifying and categorizing legal risks in a contract clause.
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
});

const IdentifyContractRisksOutputSchema = z.object({
  isValidClause: z
    .boolean()
    .describe(
      'True if the input appears to be a valid contract clause or document, false otherwise.'
    ),
  plainEnglish: z
    .string()
    .describe('Full plain-language rewrite of the entire text, preserving structure with paragraphs or bullets.'),
  summary: z.object({
    verdict: z
      .enum(['Low', 'Medium', 'High', 'Critical'])
      .describe('Overall risk verdict for the text.'),
    oneSentence: z.string().describe('A one-sentence overall risk summary.'),
  }),
  risks: z.array(RiskSchema).describe('An array of identified risks.'),
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

If the user provides a multi-clause contract, retain paragraph breaks or use bullet points in the 'plainEnglish' output to make it easy to read.

Instructions:
1. Translate the 'contractClause' into clear plain English. Preserve structural formatting (paragraphs/bullets).
2. Identify risks and categorize them ONLY as: Financial, Legal Liability, Operational, Privacy, or Non-Compete.
3. For each risk, provide:
   "risks": [ 
     { 
       "category": "Financial | Legal Liability | Operational | Privacy | Non-Compete",
       "riskFactor": "string", 
       "explanation": "string", 
       "severity": "Low|Medium|High|Critical" 
     } 
   ]
4. If isValidClause is false, explain why in plainEnglish and return an empty risks array.

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
