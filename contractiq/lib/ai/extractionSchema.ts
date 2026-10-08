import { z } from "zod";

export const extractedTermSchema = z.object({
  term_name: z.string().min(1),
  value: z.string().min(1),
  page_number: z.number().int().min(1),
  // Model self-reports 0.0-1.0; multiplied by 100 before storing (DB column is 0-100).
  confidence_score: z.number().min(0).max(1),
  source_sentence: z.string().min(1),
});

export const extractionResponseSchema = z.array(extractedTermSchema);

export type ExtractedTermFromAI = z.infer<typeof extractedTermSchema>;
