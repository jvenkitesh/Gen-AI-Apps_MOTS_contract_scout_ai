# Spec 06 — Dashboard & History

Source: `docs/engineering/engineering-doc.md` §9; PRD US-008, FR-10.

## Overview

Summary cards + a sortable table of all contracts the user has reviewed.
Reads only -- no new tables.

## Files to create/modify

- `app/(app)/dashboard/page.tsx` — replace placeholder
- `app/api/contracts/route.ts` — new (GET list)
- `app/api/dashboard/summary/route.ts` — new
- `components/dashboard/SummaryCards.tsx` — new
- `components/dashboard/ContractTable.tsx` — new

## API Contract

| Method & Path | Request | Response |
|---|---|---|
| `GET /api/contracts` | query: `sort=date\|name\|type`, `order`, `page`, `pageSize` | `200 { items: ContractSummary[], total }` |
| `GET /api/dashboard/summary` | — | `200 { total, by_type: { NDA, MSA }, recent: ContractSummary[5] }` |

## State Management

TanStack Query, standard list/detail caching keyed on sort/page params.

## Component Spec

- `SummaryCards`: total contracts, breakdown by type, last-5-reviewed list.
- `ContractTable`: sortable columns (name, type, date, status), row click
  navigates to `/contracts/:id`.

## Design

Cards = White surface, radius-lg (8px). Section header = H5 Medium
(24px/500/32px) per the Section Block pattern in `docs/design.md`.

## Edge Cases

- Zero contracts → empty state: "No contracts reviewed yet -- upload your
  first contract to begin."
- Last page of pagination with a partial page → render normally; `total` is
  always returned alongside `items` so the client never special-cases this.

## Acceptance Criteria (PRD US-008)

- Dashboard displays contract name, type, date, and status for every
  reviewed contract.
- Clicking a row opens that contract's results page.
