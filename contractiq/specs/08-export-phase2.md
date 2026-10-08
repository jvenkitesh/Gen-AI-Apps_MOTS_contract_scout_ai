# Spec 08 — Export (Phase 2, not built yet)

Source: `docs/engineering/engineering-doc.md` §10; PRD US-011.

## Overview

CSV/PDF export of extracted key terms. **Deferred to Phase 2** per the
engineering doc's roadmap -- spec'd now only so the route shape is settled
and doesn't require rework later.

## Future Files

- `app/api/contracts/[id]/export/route.ts`
- `lib/pdf/generateReport.ts`
- `lib/utils/csv.ts`

## API Contract (not implemented in Phase 1)

| Method & Path | Response |
|---|---|
| `GET /api/contracts/:id/export?format=csv` | `200` file stream, ≤5s |
| `GET /api/contracts/:id/export?format=pdf` | `200` file stream, ≤5s |

No DB, state, or component work is scheduled until Phase 2 begins. Do not
implement this spec during Stage 4 unless the user explicitly asks to pull
it forward.
