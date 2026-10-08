# ContractIQ End-to-End Test Suite

Automates the manual testing performed while implementing every Phase 1
feature. Two layers, both **real, live-network, no mocking**:

- **API-level integration tests** (Vitest, `*.test.ts` in `auth/`, `upload/`,
  `extraction/`, `viewer/`, `chat/`, `dashboard/`, `feedback/`) — call the
  running app's API routes directly over HTTP.
- **Browser E2E tests** (Playwright, `*.spec.ts` in `e2e/`) — drive the actual
  rendered UI: real clicks, real file uploads, watching a real streamed chat
  response render in the DOM. This is the only layer that can verify
  client-side behavior (auto-triggered processing on page load, inline-edit
  interactions, SSE streaming into the UI) that API-level tests can't touch.

Both layers hit the real dev Supabase project (`leqeqgrolnlbxhkjjdnq`) and
the real OpenAI API, creating and then deleting real test users, contracts,
and storage objects on every run.

## Why a separate package.json

This folder is dependency-isolated from `contractiq/` (its own
`node_modules`), but **not** secret-isolated: `vitest.setup.ts` reads
`contractiq/.env.local` directly rather than duplicating `SUPABASE_SERVICE_ROLE_KEY`
and friends into a second env file. One source of truth for secrets, one
source of truth for test-runner dependencies.

## Prerequisites

1. The ContractIQ dev server must be running: `cd contractiq && npm run dev`
   (Vitest tests fail fast with a clear message if `http://localhost:3000`
   isn't reachable; Playwright tests will simply fail to connect).
2. `contractiq/.env.local` must have real values for `NEXT_PUBLIC_SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_API_KEY`.
3. `npm install` in this folder (first time only).
4. For the Playwright layer only: `npx playwright install chromium` (first
   time only -- downloads the browser binary, not an npm package).

## Running

```bash
npm test                # full Vitest suite (API-level)
npm run test:auth       # just auth/
npm run test:upload     # just upload/
npm run test:extraction # just extraction/
npm run test:viewer     # just viewer/
npm run test:chat       # just chat/
npm run test:dashboard  # just dashboard/
npm run test:feedback   # just feedback/
npm run test:watch      # watch mode

npm run test:e2e        # full Playwright suite (browser E2E, e2e/)
npx playwright test e2e/contract-golden-path.spec.ts  # run one spec
npx playwright show-trace test-results/.../trace.zip  # debug a failure
```

Tests run sequentially (`fileParallelism: false` in `vitest.config.ts`), not
in parallel — this is a shared live project, and parallel test users/contracts
racing each other would make failures harder to diagnose. The suite takes
roughly 20-30 seconds as a result; that's expected, not a performance bug.

## Known limitation: Supabase's email rate limit

`auth-signup-happy-path` (Vitest), `auth-signup-duplicate-confirmed-email`
(Vitest), and `auth-signup-shows-confirmation` (Playwright) all call the
real `supabase.auth.signUp()` API/form, which sends an actual confirmation
email every time. Supabase's free tier rate-limits project-wide email
sending. If you run these repeatedly in a short window, they can fail with a
real `429`/`"Please wait a moment before trying again."` from Supabase
itself — this is not a bug in the route (which correctly returns `429
RATE_LIMITED` rather than crashing) or in the test, just an external quota.
If you hit this, wait a few minutes and re-run. Every other test in the
suite uses `admin.auth.admin.createUser(..., { email_confirm: true/false })`
instead, which does not send email and is not subject to this limit —
including the Playwright golden-path test, which is unaffected.

## Test index

Each file is independently isolated: creates its own test user(s) in
`beforeAll`, asserts in `it`, deletes everything it created in `afterAll`
(user deletion cascades to `profiles`/`contracts`/`custom_key_terms`; Storage
objects are deleted explicitly since Storage isn't covered by that cascade).

### `auth/`

| Test | Covers | Priority |
|---|---|---|
| `auth-signup-happy-path` | Real signup creates a Supabase Auth user + a `profiles` row via the `handle_new_user()` trigger | **P0** |
| `auth-signup-invalid-payload` | Malformed email / short password → `422 VALIDATION_ERROR` | P1 |
| `auth-signup-duplicate-confirmed-email` | Signing up with an already-confirmed email → `409 EMAIL_ALREADY_REGISTERED` (not the generic fallback) | P1 |
| `auth-login-happy-path` | Confirmed user can log in, session cookie is set | **P0** |
| `auth-login-invalid-credentials` | Wrong password → generic `401`, no field-specific hint | P1 |
| `auth-login-unconfirmed-email` | Unverified account is blocked with `EMAIL_NOT_CONFIRMED`, not a generic error | P1 |

### `upload/`

| Test | Covers | Priority |
|---|---|---|
| `upload-unauthenticated-rejected` | No session → `401` before any file is even read | **P0** |
| `upload-cross-user-ownership-isolation` | User B cannot add/delete a custom term on User A's contract — `404`, never `403` | **P0** |
| `upload-nda-happy-path` | Real NDA PDF uploads, correct 10-item NDA term list, `[PAGE N]` markers persisted, Storage upload succeeds | **P0** |
| `upload-msa-happy-path` | Real MSA PDF uploads, correct 12-item MSA term list (different shape than NDA — not just a copy-paste check) | **P0** |
| `upload-custom-terms-lifecycle` | Add up to 5, 6th rejected (`MAX_CUSTOM_TERMS`), remove frees a slot, delete-nonexistent → `404`, name length validation | P1 |
| `upload-oversize-file-rejected` | 11MB file → `422` before parsing | P1 |
| `upload-malformed-pdf-rejected` | Regression guard: an unparseable PDF used to crash the route with an uncaught `500`; now returns a clean `422 UNREADABLE_PDF` | P1 |

### `extraction/`

| Test | Covers | Priority |
|---|---|---|
| `extraction-nda-happy-path` | Real GPT-4o extraction on a real NDA: grounded values, valid page numbers, confidence 0-100, non-empty source sentences; also covers re-process → `409` using the same completed contract | **P0** |
| `extraction-msa-happy-path` | MSA term list (different shape than NDA); custom-term matching — `is_manual` + `custom_key_term_id` correctly set when a custom term is actually found | **P0** |
| `extraction-cross-user-rejected` | Processing someone else's contract → `404` (no extraction call needed — ownership checked first) | **P0** |

### `viewer/`

| Test | Covers | Priority |
|---|---|---|
| `viewer-full-lifecycle` | GET shape + `pdf_available`; signed URL is genuinely fetchable; inline correction preserves `original_ai_value` across multiple edits; edits blocked (`409`) while `status==='processing'`; DELETE cascades DB rows + removes the Storage object | **P0** |
| `viewer-cross-user-rejected` | GET / pdf-url / PATCH / DELETE all → `404` for a non-owner | **P0** |

### `chat/`

| Test | Covers | Priority |
|---|---|---|
| `chat-full-flow` | Real streaming response is grounded + page-cited; a follow-up correctly recalls prior answer from conversation history; exactly one session persists both turns in order; message >5000 chars → `422` | **P0** |
| `chat-blocked-before-completed` | GET history on an unprocessed contract returns empty (not an error); POST before `completed` → `404` | P1 |
| `chat-cross-user-rejected` | GET history / POST message → `404` for a non-owner | **P0** |

### `dashboard/`

| Test | Covers | Priority |
|---|---|---|
| `dashboard-full` | Empty state; summary + list reflect real uploads; sort by name; cross-user isolation | P1 |

### `feedback/`

| Test | Covers | Priority |
|---|---|---|
| `feedback-full` | Submit + resubmission upserts the same row (not a duplicate); comment >2000 chars → `422`; cross-user → `404` | P1 |

### `e2e/` (Playwright — real browser, not API calls)

| Test | Covers | Priority |
|---|---|---|
| `contract-golden-path` | The single most valuable test in the suite: real login → upload a real PDF via the file chooser → pre-processing preview renders → "Process Contract" click → auto-triggered extraction banner appears/clears → real extracted terms render → inline-edit a term by clicking it and see the "Edited" badge → submit feedback and see the toast → open chat, send a real message, see a real streamed response render in the DOM | **P0** |
| `auth-login-redirects-to-dashboard` | Real form fill + submit + redirect + empty-state copy renders | **P0** |
| `unauthenticated-redirect` | Visiting `/dashboard` logged out redirects to `/login` (middleware, confirmed in a real browser) | **P0** |
| `auth-signup-shows-confirmation` | Real signup form submission shows the "Check your email" screen | P1 |

## Recommended priority order (if triaging which to trust/run first)

1. **P0 — foundational + security-critical.** Auth happy paths (nothing else
   works without login), unauthenticated-upload-rejected, and every
   cross-user-ownership-isolation test (upload, extraction, viewer, chat).
   These are ranked above most feature-correctness tests deliberately: for a
   product handling other people's legal documents, a cross-user data leak
   is the single worst failure mode this suite can catch — higher severity
   than most functional edge cases, even though isolation tests "sound like"
   edge cases.
2. **P0 — core value delivery.** Upload, extraction, and viewer happy paths
   (NDA + MSA), the chat grounding/citation/memory test, and
   `contract-golden-path` (Playwright) specifically — it's the only test
   that proves the real rendered UI works end to end, not just the API
   underneath it. If you can only run one test before a release, run this
   one.
3. **P1 — hardening.** Everything else: validation edge cases (oversize,
   malformed PDF, duplicate email, unconfirmed email, invalid payloads,
   custom-term limits, message length, comment length), dashboard, and
   feedback. Important for correctness and UX, but a failure here is a rough
   edge, not a security or core-functionality incident.

All Phase 1 MVP features now have coverage at both the API level (Vitest)
and, for the critical path, the real-browser level (Playwright). Add test
files for Phase 2 features (export, batch upload, dashboard analytics) as
they land, following this same `<feature>-<action>-<scenario>` naming
pattern.
