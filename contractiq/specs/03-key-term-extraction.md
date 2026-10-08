# Spec 03 — AI Key Term Extraction

Source: `docs/engineering/engineering-doc.md` §8, §9; PRD US-003, US-004, FR-04, FR-11.

## Overview

Triggers GPT-4o structured extraction against the stored `contract_text`,
validates the output, and writes `extracted_key_terms` rows with page number,
confidence score, and source sentence per term.

## Files to create/modify

- `app/api/contracts/[id]/process/route.ts` — new
- `lib/ai/openaiClient.ts` — new
- `lib/ai/extractionSchema.ts` — new (Zod schema)
- `lib/ai/prompts/extraction.ts` — new (few-shot prompt builder)

## Data Model

`extracted_key_terms` table (see `specs/supabase-schema.sql`): `term_name,
value, page_number, confidence_score, source_sentence, is_manual,
custom_key_term_id`. Also creates the `term_corrections` view (depends on
this table's `is_edited` column, added here even though it's used by spec 05).

## API Contract

| Method & Path | Request | Response | Validation |
|---|---|---|---|
| `POST /api/contracts/:id/process` | `{}` | `200 { terms: ExtractedTerm[] }` | contract must be `status IN ('uploaded','error')`; sets `processing` → `completed`/`error` |

## Prompt Contract (concrete)

- Model `gpt-4o`, `response_format: { type: "json_object" }`, `temperature: 0.1`, `max_tokens: 2000`.
- System prompt = few-shot block for `contract_type` (3 labelled examples) +
  standard term list (from `lib/ai/termLibrary.ts`) + any `custom_key_terms`
  rows appended as additional target terms + the output-schema instruction.
- Output schema (`lib/ai/extractionSchema.ts`):
  ```ts
  import { z } from "zod";
  export const extractionSchema = z.array(z.object({
    term_name: z.string(),
    value: z.string(),
    page_number: z.number().int().min(1),
    confidence_score: z.number().min(0).max(1), // x100 before storing
    source_sentence: z.string(),
  }));
  ```
- On JSON parse failure: retry exactly once with the literal corrective
  prompt: `"Your previous response was not valid JSON. Return only the JSON
  array, no explanation."` A second failure sets `contracts.status =
  'error'`, `error_message` populated, **zero rows written** -- validate
  fully before the first INSERT.
- Confidence is self-reported by the model in the same call -- never a
  second inference.
- Retry/fallback: 3x exponential backoff on OpenAI 429/5xx before surfacing
  failure to the user.

## State Management

`refetchInterval` polling (TanStack Query) on `GET /api/contracts/:id` while
`status === 'processing'`, driving a 3-step progress indicator ("Extracting
text" → "Analysing with AI" → "Compiling results").

## Edge Cases

- 0 terms extracted (valid model output, empty array) → "No key terms found
  -- this may not be a standard NDA/MSA," not treated as an error.
- All terms <50% confidence → still display all of them with warnings, never
  suppress.
- OpenAI 429/5xx → 3x exponential backoff before surfacing failure.

## Acceptance Criteria (PRD US-003, US-004, FR-11)

- Extraction completes within 30s P95 for contracts ≤20 pages.
- Key terms panel shows ≥80% of standard terms with values.
- Each term displays a page number and a 0-100% confidence score.
- Terms below 50% confidence show a non-dismissible warning icon + tooltip,
  and are never hidden from the panel.
