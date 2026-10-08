# Spec 07 — Feedback

Source: `docs/engineering/engineering-doc.md` §9; PRD US-010, FR-12.

## Overview

Thumbs up/down + optional comment per contract, one submission per user per
contract (resubmission upserts).

## Files to create/modify

- `app/api/contracts/[id]/feedback/route.ts` — new (POST)
- Feedback widget embedded directly in `app/(app)/contracts/[id]/page.tsx`
  (no separate page)

## Data Model

`user_feedback` table: `contract_id`, `rating` (`up`|`down`), `comment`
(≤2000 chars), `UNIQUE(contract_id, user_id)`.

## API Contract

| Method & Path | Request | Response |
|---|---|---|
| `POST /api/contracts/:id/feedback` | `{ rating: 'up'\|'down', comment?: string }` | `200 { feedback }` — `ON CONFLICT (contract_id, user_id) DO UPDATE` |

## State Management

Simple `useMutation` + toast on success.

## Design

Success toast = Green family (`bg-green-50 border-green-500 text-green-700`
per the State Colors table in `docs/design.md`).

## Edge Cases

- Comment >2000 chars → `422`.
- Resubmission → upsert silently, no "already submitted" error.

## Acceptance Criteria (PRD US-010)

- User can submit thumbs up/down plus an optional comment on the results
  page; it is saved to `user_feedback`.
