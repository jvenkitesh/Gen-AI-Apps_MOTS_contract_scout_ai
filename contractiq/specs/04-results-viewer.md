# Spec 04 — Results Display: Viewer + Key Terms Panel + Inline Correction

Source: `docs/engineering/engineering-doc.md` §5, §9; PRD US-006, US-007 (viewer part), US-009, FR-06, FR-07, FR-09(ui).

## Overview

The results page is a two-panel layout: left is the contract viewer (PDF or
text fallback), right is the key-terms panel. Clicking a term scrolls the
viewer to its page. Terms are inline-editable.

## Files to create/modify

- `app/(app)/contracts/[id]/page.tsx` — replace placeholder, becomes the
  container for viewer + panel + chat (chat is spec 06)
- `app/api/contracts/[id]/route.ts` — new (GET, DELETE)
- `app/api/contracts/[id]/pdf-url/route.ts` — new
- `app/api/contracts/[id]/terms/[termId]/route.ts` — new (PATCH)
- `components/contracts/PdfViewer.tsx` — new
- `components/contracts/TextViewerFallback.tsx` — new
- `components/contracts/KeyTermsPanel.tsx` — new
- `components/contracts/KeyTermRow.tsx` — new
- `components/contracts/ConfidenceBadge.tsx` — new
- `lib/hooks/useContract.ts` — new (TanStack Query hook)
- A `ContractViewerContext` (can live in `app/(app)/contracts/[id]/page.tsx`
  or its own file in `lib/hooks/`) holding `{ targetPage, setTargetPage, zoom }`

## API Contract

| Method & Path | Response |
|---|---|
| `GET /api/contracts/:id` | `200 { contract, terms, custom_terms, pdf_available }` -- bumps `last_accessed_at` |
| `GET /api/contracts/:id/pdf-url` | `200 { signed_url, expires_at }` (1hr) or `404` (-> fallback) |
| `PATCH /api/contracts/:id/terms/:termId` | `{ value: string }` -> `200 { term }`, ≤2s |
| `DELETE /api/contracts/:id` | `204` -- deletes Storage object then DB row (cascades) |

Inline correction detail: on the first edit only, copy the current `value`
into `original_ai_value` before overwriting (`WHERE original_ai_value IS
NULL`); subsequent edits update `value` only.

## State Management

- Server state via TanStack Query (`useContract(id)` hook wrapping `GET
  /api/contracts/:id`).
- Local UI state via `ContractViewerContext` (`targetPage`, `zoom`) shared
  between `PdfViewer` and `TextViewerFallback` so a `KeyTermRow` click sets
  `targetPage` and both viewers react identically (FR-06).
- Term edits: optimistic `useMutation` -- update the cached term immediately,
  roll back on `4xx`/`5xx`.

## Component Spec

- `KeyTermsPanel`: renders one `KeyTermRow` per term, grouped standard-first
  then custom (via `is_manual`).
- `KeyTermRow`: term name, value (click to edit inline), page number (click
  navigates viewer), `ConfidenceBadge`, "Edited" badge if `is_edited`.
- `ConfidenceBadge`: thresholds below.
- `PdfViewer`: renders from the signed URL (react-pdf or pdf.js), responds to
  `targetPage` by scrolling + highlighting.
- `TextViewerFallback`: parses `[PAGE N]` markers from `contract_text`,
  renders as scrollable sections, responds to the same `targetPage` prop.

## Design

**Confidence badge thresholds** (exact tokens from `docs/design.md`'s
Semantic Status Badge pattern):

| Confidence | Background | Border | Text |
|---|---|---|---|
| ≥80% (green) | Green 50 `#E7F6E7` | Green 200 `#92D490` | Green 700 `#0D720A` |
| 50-79% (amber) | Yellow 50 `#FFF9F0` | Yellow 200 `#FFE3BD` | Yellow 800 `#B36800` |
| <50% (red) | Red 50 `#FAEBEB` | Red 200 `#EAA2A3` | Red 700 `#942528` |

All: Paragraph Small Medium, radius-sm (4px), padding 2px 8px -- use the
existing `components/ui/Badge.tsx` primitive with `color="green"|"yellow"|"red"`.

"Edited" badge = `color="blue"` on the same `Badge` primitive.

Viewer surface = White on Grey 25 page background per the Layout Structure
rules in `docs/design.md`.

## Edge Cases

- `file_path` null (Storage failed at upload) → render `TextViewerFallback`,
  no error shown (expected non-blocking path).
- Signed URL expired mid-session → silently refetch via `pdf-url` before the
  viewer errors.
- Edit attempted while `contract.status === 'processing'` → block with
  "Processing in progress, try again shortly."
- Two tabs editing the same term → last write wins (acceptable at MVP scale).

## Acceptance Criteria (PRD US-003, US-006, US-009)

- Each term displays a page number; clicking scrolls the PDF viewer to that
  page.
- Viewer renders all pages with scroll/zoom; highlighted references are
  clickable.
- Inline edit saves within 2 seconds, shows an "Edited" badge, and the
  original AI value is retained separately.
