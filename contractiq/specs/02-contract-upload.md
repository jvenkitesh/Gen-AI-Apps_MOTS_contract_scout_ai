# Spec 02 — Contract Upload, Text Extraction & Custom Key Terms

Source: `docs/engineering/engineering-doc.md` §4.2, §7, §9; PRD US-002, US-005, FR-02, FR-03, FR-05, FR-14.

## Overview

A user picks a contract type (NDA/MSA), uploads a PDF, the server extracts
text with page markers and stores it, and the user may add up to 5 custom key
terms before triggering AI processing (spec 03).

## Files to create/modify

- `app/(app)/contracts/upload/page.tsx` — replace placeholder
- `app/api/contracts/upload/route.ts` — new
- `app/api/contracts/[id]/custom-terms/route.ts` — new (POST)
- `app/api/contracts/[id]/custom-terms/[termId]/route.ts` — new (DELETE)
- `components/contracts/UploadForm.tsx` — new
- `lib/pdf/extractText.ts` — new
- `lib/ai/termLibrary.ts` — new (standard NDA/MSA term lists)

## Data Model

`contracts` and `custom_key_terms` tables (see `specs/supabase-schema.sql`).
Key columns for this spec: `contracts.{contract_type, status, contract_text,
page_count, file_size_bytes, file_path}`; `custom_key_terms.{contract_id,
term_name}`.

## API Contract

| Method & Path | Request | Response | Validation |
|---|---|---|---|
| `POST /api/contracts/upload` | `multipart/form-data`: `file` (PDF), `contract_type` | `201 { contract_id, contract_type, page_count, standard_terms: string[] }` | MIME `application/pdf`; size ≤10,485,760 bytes; pages ≤20; word count <100 → insert `status='error'` row, `422 SCANNED_PDF_UNSUPPORTED` |
| `POST /api/contracts/:id/custom-terms` | `{ term_name: string }` | `201 { id, term_name }` | 2–100 chars; `422 MAX_CUSTOM_TERMS` if already 5 |
| `DELETE /api/contracts/:id/custom-terms/:termId` | — | `204` | `404` if not found/not owned |

**Implementation order for `upload/route.ts`** (Storage must never block the response):
1. Validate MIME/size from the multipart payload before reading the buffer.
2. Run `pdf-parse` on the buffer; count words; if <100, insert `status='error'` row, return `422` immediately.
3. Build `[PAGE N]`-marked text from pdf-parse's per-page output.
4. `INSERT INTO contracts (...) RETURNING id` — get the id before any Storage call.
5. Attempt `supabase.storage.from('contracts').upload(\`${userId}/${contractId}/${filename}\`, buffer)`. On success, `UPDATE contracts SET file_path = ...`. On failure, log and continue -- `file_path` stays null.
6. Return `201` with the standard term preview for the chosen `contract_type`.

## Standard Term Lists (`lib/ai/termLibrary.ts`, verbatim from PRD §4)

```ts
export const STANDARD_TERMS: Record<"NDA" | "MSA", string[]> = {
  NDA: [
    "Parties", "Effective Date", "Confidentiality Obligations",
    "Permitted Disclosures", "Term & Duration", "Governing Law",
    "Jurisdiction", "IP Ownership", "Non-Solicitation", "Breach & Remedy",
  ],
  MSA: [
    "Parties", "Service Scope", "Payment Terms", "Invoice Schedule",
    "Late Payment Penalty", "Liability Cap", "Indemnification",
    "IP Ownership", "Termination Clause", "Governing Law",
    "Dispute Resolution", "Notice Period",
  ],
};
```

## State Management

Client-side `useMutation` (TanStack Query) wrapping the multipart `fetch`; on
success, navigate to the pre-processing preview with `contract_id` in the
route. Custom-term add/remove use optimistic `useMutation` against the cached
preview list.

## Component Spec

`UploadForm.tsx`: segmented control for `contract_type`, dropzone (drag/drop +
file-pick fallback), standard term preview list (read-only), custom-term chip
list with "+ Add Key Term" input (disabled once 5 reached), "Process
Contract" button navigating to the processing step (spec 03).

## Design

Dropzone = Card pattern, radius-lg (8px), dashed border Grey 200 (`#C1C2C3`),
hover state Grey 50 bg per the Interaction table (100ms ease-out). "Custom"
badge = Violet accent family (`bg-violet-50 border-violet-200 text-violet-700`,
radius-sm, padding 2px 8px) via the `Badge` primitive with `color="violet"`.

## Edge Cases

- File >10MB or >20 pages → rejected client-side before upload attempt, same
  limit re-validated server-side.
- Non-PDF MIME → reject with "Only PDF files are supported."
- Scanned PDF (<100 words extracted) → "Scanned PDFs are not supported yet."
- Storage upload failure → contract still usable via the text-viewer fallback
  (spec 04); no user-facing error at upload time.
- 6th custom term attempt → rejected at the API layer before the DB trigger
  ever fires.

## Acceptance Criteria (PRD US-002, US-005)

- Upload accepts files up to 10MB.
- Key terms panel later shows ≥80% of standard terms with values (verified in
  spec 03, not here -- this spec only covers getting the text into the DB).
- Custom terms appear in the pre-processing preview and are processed with
  the same data structure as standard terms (verified in spec 03).
