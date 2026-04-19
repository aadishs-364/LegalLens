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
    .describe('The legal contract clause to analyze.'),
});
export type IdentifyContractRisksInput = z.infer<typeof IdentifyContractRisksInputSchema>;

const RiskSchema = z.object({
  riskTitle: z.string().describe('A concise title for the identified risk.'),
  category: z
    .enum([
      'Indemnification',
      'Limitation of Liability',
      'Auto-Renewal',
      'Unilateral Modification',
      'Jurisdiction/Governing Law',
      'IP Assignment',
      'Non-Compete/Non-Solicitation',
      'Data Privacy',
      'Termination Without Cause',
      'Liquidated Damages',
      'Other',
    ])
    .describe('The category of the risk.'),
  severity: z
    .enum(['Low', 'Medium', 'High', 'Critical'])
    .describe('The severity level of the risk.'),
  originalFragment: z
    .string()
    .describe('Exact quoted text from the input that triggered this risk.'),
  explanation: z
    .string()
    .describe('Explanation of why this risk matters in plain English.'),
  lawyerTip: z
    .string()
    .describe('A specific question the user should ask a lawyer regarding this risk.'),
});

const IdentifyContractRisksOutputSchema = z.object({
  isValidClause: z
    .boolean()
    .describe(
      'True if the input appears to be a valid contract clause, false otherwise.'
    ),
  plainEnglish: z
    .string()
    .describe('Full plain-language rewrite of the entire clause.'),
  summary: z.object({
    verdict: z
      .enum(['Low', 'Medium', 'High', 'Critical'])
      .describe('Overall risk verdict for the clause.'),
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
  prompt: `You are ClearClause, an expert legal translator with 20 years of experience making contracts understandable to everyday people. Your ONLY job is to analyze contract text and return a structured JSON response.

You MUST respond with ONLY valid JSON matching the exact schema provided in your instructions — no markdown, no preamble, no explanation outside the JSON.

If isValidClause is false, return empty arrays and explain in plainEnglish that the input doesn't appear to be a contract clause.

Instructions:
1. Translate the entire provided 'contractClause' into clear, concise, easy-to-understand plain English.
2. Identify and highlight all potential legal risks within the 'contractClause'. The specific risk categories to detect are: Indemnification, Limitation of Liability, Auto-Renewal, Unilateral Modification, Jurisdiction/Governing Law, IP Assignment, Non-Compete/Non-Solicitation, Data Privacy, Termination Without Cause, Liquidated Damages. If a risk doesn't fit these, use 'Other'.
3. For each identified risk, provide a 'riskTitle', categorize it, assign a 'severity' (Low, Medium, High, Critical), extract the 'exact original fragment' from the input that triggered the risk, 'explain' why it matters in plain English, and suggest a 'lawyerTip' which is a specific question the user should ask a lawyer.
4. Provide a one-sentence overall risk 'verdict' for the entire clause.
5. If the input does not appear to be a contract clause, set 'isValidClause' to false, provide a suitable explanation in 'plainEnglish', and return an empty array for 'risks'.
6. Do NOT provide legal advice. Be neutral, factual, and slightly cautious.

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
