# ContractIQ — Implementation Specifications

**Status:** Draft for review (Stage 1 of 7, companion to `engineering-doc.md`)
**Source:** `docs/engineering/engineering-doc.md` (approved) + `docs/ContractIQ_PRD.md`
**Generated per:** `skills/implementation-specs/SKILL.md` methodology — every
distinct concern in the engineering plan (features, integrations, data
models, flows, infrastructure) expanded into a self-contained, concrete,
runnable-where-applicable spec. Consolidated into one file at
`docs/engineering/implementation-specs.md` per this project's Stage 1
convention, rather than the skill's usual `docs/specs/*.md` multi-file form.

> Each spec below is self-contained: a developer (or Claude, in Stage 4) can
> read any one section alone and know exactly what to build. No "TBD", no
> "as needed" — every value is concrete. Sections 12 and 13 (schema SQL and
> env vars) are always-included per the skill's rules and are directly
> runnable/copyable as-is.

---

## 1. Auth & Session Management

**Concern:** email/password signup, login, logout, session persistence, route protection.

**User flow:**
```
Signup:  Landing "Sign Up" -> email+password form -> POST /api/auth/signup
         -> supabase.auth.signUp() (server-side, @supabase/ssr cookies)
         -> verification email sent -> user clicks link -> session active
         -> redirect to /dashboard (empty state)
Login:   "Log In" -> POST /api/auth/login -> signInWithPassword() server-side
         -> session cookie set -> redirect to /dashboard
Logout:  POST /api/auth/logout -> supabase.auth.signOut() server-side -> redirect to /login
```

**Data model:** `profiles` table (see §12 for DDL) — one row per `auth.users`
row, created by the `handle_new_user()` trigger on `auth.users` INSERT.
`display_name` nullable, `onboarding_completed_at` nullable (drives the v1.0
onboarding-tooltip requirement).

**DB tasks (order):**
1. Enable email/password provider in Supabase Auth settings (dashboard, not SQL).
2. Run §12's `profiles` table + `handle_new_user()` trigger + trigger binding
   (`CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users ...`).
3. Confirm RLS is enabled on `profiles` (`auth.uid() = id`).

**API routes:**
| Method & Path | Request | Response | Validation |
|---|---|---|---|
| `POST /api/auth/signup` | `{ email: string, password: string }` | `201 {}` , session cookie set | email format; password ≥8 chars (Supabase default policy) |
| `POST /api/auth/login` | `{ email, password }` | `200 {}`, session cookie set | `401` on bad credentials, generic message (no "email not found" leakage) |
| `POST /api/auth/logout` | — | `204` | requires valid session |

**State management:** no server-state library needed here — session presence
is read via Supabase's server client in `middleware.ts` on every request to
`(app)/**`; client components get the user via a root-level session check
that redirects unauthenticated users to `/login`.

**Components:** `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`,
`app/(auth)/reset-password/page.tsx` (calls `supabase-js` directly client-side
— no custom route, uses Supabase's hosted reset email flow).

**Design:** form fields use the Input component (radius `6px` per
`docs/design.md`'s Border Radius Rules), primary action button = Blue brand
token (`Token colors/.../text-gray-primary` is for body text; the button
itself uses the Interactive/brand rule — Primary Blue ★500 `#115ACB`) at
radius `6px`; inline error text uses the Error state block
(`background: Red 50 #FAEBEB`, `border: Red 500 #D13438`, `text: Red 700
#942528`) under the field, Paragraph Small Regular (12px).

**Edge cases:** duplicate email on signup → Supabase returns a conflict,
surface "An account with this email already exists"; login before email
verification → block with "Please verify your email first, check your
inbox"; password reset on a non-existent email → always return a generic
success message (don't leak account existence).

---

## 2. Contract Upload & Text Extraction

**Concern:** PDF intake, validation, server-side text extraction, non-blocking Storage upload.

**User flow:** see `engineering-doc.md` §4.2 (reproduced): type selector →
drag/drop PDF → `POST /api/contracts/upload` → pdf-parse → `[PAGE N]`-marked
text → `contracts` row inserted → Storage upload attempted (non-blocking) →
standard term-list preview returned.

**Data model:** `contracts` table (§12). Key columns for this concern:
`contract_type`, `status`, `contract_text`, `page_count`, `file_size_bytes`,
`file_path` (nullable — Storage failure must never block the upload
response), `last_accessed_at`.

**DB tasks (order):** create enums (`contract_type_enum`,
`contract_status_enum`) first, then `contracts` table (no FK dependencies —
first table after `profiles`), then the `contracts` Storage bucket + its 3
RLS policies (§12).

**API route:**
| Method & Path | Request | Response | Validation |
|---|---|---|---|
| `POST /api/contracts/upload` | `multipart/form-data`: `file` (PDF), `contract_type` (`NDA`\|`MSA`) | `201 { contract_id, contract_type, page_count, standard_terms: string[] }` | MIME must be `application/pdf`; size ≤10,485,760 bytes; pdf-parse-reported page count ≤20; if extracted word count <100 → insert row with `status='error'`, respond `422 { error: 'SCANNED_PDF_UNSUPPORTED' }` |

Standard term list returned per type (verbatim from PRD §4, hardcoded in
`lib/ai/termLibrary.ts`):
- **NDA:** Parties, Effective Date, Confidentiality Obligations, Permitted
  Disclosures, Term & Duration, Governing Law, Jurisdiction, IP Ownership,
  Non-Solicitation, Breach & Remedy.
- **MSA:** Parties, Service Scope, Payment Terms, Invoice Schedule, Late
  Payment Penalty, Liability Cap, Indemnification, IP Ownership, Termination
  Clause, Governing Law, Dispute Resolution, Notice Period.

**Implementation order for this route (concrete, since Storage must not block upload):**
1. Validate MIME/size from the multipart payload before reading the buffer.
2. Run `pdf-parse` on the buffer; count words; if <100, insert `status='error'` row and return `422` immediately — do not attempt Storage.
3. Build `[PAGE N]`-marked text by iterating pdf-parse's per-page output.
4. `INSERT INTO contracts (...) VALUES (...) RETURNING id` — get the id before any Storage call, since the Storage path requires it.
5. Attempt `supabase.storage.from('contracts').upload(`${userId}/${contractId}/${filename}`, buffer)`. On success, `UPDATE contracts SET file_path = ...`. On failure, log and continue — `file_path` stays null, response is unaffected.
6. Return `201` with the standard term preview for the chosen `contract_type`.

**State management:** client-side `useMutation` (TanStack Query) wrapping the
multipart `fetch`; on success, navigate to the pre-processing preview view
with `contract_id` in the route.

**Components:** `components/contracts/UploadForm.tsx` — type selector
(segmented control), dropzone (drag/drop + file picker fallback), standard
term preview list, "+ Add Key Term" entry point (see §3).

**Design:** dropzone = Card pattern, radius `8px`, dashed border Grey 200
(`#C1C2C3`), hover state per the Interaction table (`Grey 50` bg, `100ms
ease-out`); upload-progress uses the skeleton→content transition (`300ms
ease-in-out`) per `docs/design.md`'s Motion Language.

**Edge cases:** file >10MB → reject client-side before upload attempt, same
limit re-validated server-side; >20 pages → same pattern; non-PDF MIME →
reject with "Only PDF files are supported"; Storage upload failure →
contract still usable via text-viewer fallback (§5), no user-facing error.

---

## 3. Custom Key Terms

**Concern:** user-requested terms added before processing, capped at 5.

**Data model:** `custom_key_terms` table (§12) — `contract_id`, `term_name`
(2–100 chars).

**DB tasks:** create after `contracts` (FK dependency); add the
`enforce_max_custom_terms()` `BEFORE INSERT` trigger (defense-in-depth behind
the API check below).

**API routes:**
| Method & Path | Request | Response | Validation |
|---|---|---|---|
| `POST /api/contracts/:id/custom-terms` | `{ term_name: string }` | `201 { id, term_name }` | 2–100 chars; `422 MAX_CUSTOM_TERMS` if the contract already has 5 |
| `DELETE /api/contracts/:id/custom-terms/:termId` | — | `204` | `404` if not found/not owned |

**State management:** optimistic `useMutation` — append/remove from the
cached preview list immediately, roll back on error.

**Components:** term-chip list inside `UploadForm.tsx`, each chip with a
"Custom" badge and a remove (×) affordance.

**Design:** "Custom" badge uses the Semantic Status Badge pattern in the
Violet accent family (`background: Violet 50 #F7F0FF`, `border: 1px solid
Violet 200 #E3C7FF`, `text: Violet 700 #6600CC`, Paragraph Small Medium,
radius `4px`, padding `2px 8px`) — distinguishing custom terms from standard
ones without introducing a new color outside the design system's five
families.

**Edge cases:** 6th term attempt → reject at the API layer before the DB
trigger ever fires; duplicate term name → allowed (no uniqueness constraint;
the AI will simply extract it once, duplicate requests are a user error, not
a system one worth blocking).

---

## 4. Key Term Extraction (AI)

**Concern:** GPT-4o structured extraction, confidence scoring, source attribution.

**Data model:** `extracted_key_terms` table (§12) — `term_name`, `value`,
`page_number`, `confidence_score` (0–100, stored as `numeric(5,2)`),
`source_sentence`, `is_manual`, `custom_key_term_id` (nullable FK).

**DB tasks:** create after `contracts` and `custom_key_terms` exist (both are
FK targets); also create the `term_corrections` view (§12) at this point,
since it depends on this table's `is_edited` column.

**API route:**
| Method & Path | Request | Response | Validation |
|---|---|---|---|
| `POST /api/contracts/:id/process` | `{}` | `200 { terms: ExtractedTerm[] }` | contract must be `status IN ('uploaded','error')`; sets `processing` → `completed`/`error` |

**Prompt contract (concrete, not just "a prompt"):**
- Model `gpt-4o`, `response_format: { type: "json_object" }`, `temperature: 0.1`, `max_tokens: 2000`.
- System prompt = `[few-shot block for contract_type]` + `[standard term list for contract_type]` + `[any custom_key_terms rows, appended as additional target terms]` + the output-schema instruction below.
- Output schema (Zod, validated before any DB write):
  ```ts
  z.array(z.object({
    term_name: z.string(),
    value: z.string(),
    page_number: z.number().int().min(1),
    confidence_score: z.number().min(0).max(1), // x100 before storing
    source_sentence: z.string(),
  }))
  ```
- On JSON parse failure: retry exactly once with the literal corrective
  prompt `"Your previous response was not valid JSON. Return only the JSON
  array, no explanation."` A second failure sets
  `contracts.status = 'error'`, `error_message` populated, **zero rows
  written** (validate fully before the first INSERT — no partial writes).
- Confidence is self-reported by the model in the same call — never a second
  inference.

**State management:** `refetchInterval` polling (TanStack Query) on the
contract's `GET /api/contracts/:id` while `status === 'processing'`, driving
a 3-step progress indicator ("Extracting text" → "Analysing with AI" →
"Compiling results").

**Components:** processing-state UI inside `app/(app)/contracts/[id]/page.tsx`.

**Edge cases:** 0 terms extracted (valid model output, just empty array) →
show "No key terms found — this may not be a standard NDA/MSA" rather than
treating it as an error; all terms <50% confidence → still display all of
them with warnings, never suppress; OpenAI 429/5xx → 3x exponential backoff
before surfacing failure.

---

## 5. Results Display — Viewer + Key Terms Panel

**Concern:** two-panel results page; PDF viewer with text-viewer fallback; confidence-coded term list.

**Data model:** reads `contracts` (for `file_path`, `contract_text`) and
`extracted_key_terms` — no new tables.

**API routes:**
| Method & Path | Response |
|---|---|
| `GET /api/contracts/:id` | `200 { contract, terms, custom_terms, pdf_available }` — bumps `last_accessed_at` |
| `GET /api/contracts/:id/pdf-url` | `200 { signed_url, expires_at }` (1hr) or `404` (→ fallback) |

**State management:** server state via TanStack Query (`GET /api/contracts/:id`);
local UI state via a `ContractViewerContext` (current page, zoom) shared
between `PdfViewer` and `TextViewerFallback` so a key-term-row click (setting
`targetPage`) drives either viewer identically.

**Components:** `components/contracts/{PdfViewer,TextViewerFallback,KeyTermsPanel,KeyTermRow,ConfidenceBadge}.tsx`.

**Design — confidence badge thresholds (concrete, directly from `docs/design.md`'s Semantic Status Badge pattern):**
| Confidence | Family | Background | Border | Text |
|---|---|---|---|---|
| ≥80% (green) | Success | Green 50 `#E7F6E7` | 1px Green 200 `#92D490` | Green 700 `#0D720A` |
| 50–79% (amber) | Warning | Yellow 50 `#FFF2E0` wait — use Yellow 100 `#FFF2E0`/Yellow 50 `#FFF9F0` per family scale; border Yellow 200 `#FFE3BD` | — | Yellow 800 `#B36800` |
| <50% (red) | Error | Red 50 `#FAEBEB` | 1px Red 200 `#EAA2A3` | Red 700 `#942528` |

All three: Paragraph Small Medium text, `border-radius: 4px`, `padding: 2px 8px` — the exact Semantic Status Badge spec in `docs/design.md`.

**Edge cases:** `file_path` null (Storage failed at upload) → render
`TextViewerFallback` parsing `[PAGE N]` markers from `contract_text`, no
error shown to the user since this is an expected non-blocking path; signed
URL expired mid-session → silently refetch via `pdf-url` before the viewer
errors.

---

## 6. Inline Correction

**Concern:** editable term values with original-AI-value retention.

**Data model:** `extracted_key_terms.{is_edited, original_ai_value, edited_at}`.

**API route:**
| Method & Path | Request | Response |
|---|---|---|
| `PATCH /api/contracts/:id/terms/:termId` | `{ value: string }` | `200 { term }` — must respond ≤2s |

**Implementation detail:** on the first edit only, copy the current `value`
into `original_ai_value` before overwriting (`WHERE original_ai_value IS
NULL`); subsequent edits update `value` only, leaving `original_ai_value` at
the first-ever AI output.

**State management:** optimistic `useMutation` — update the cached term
immediately, roll back on `4xx`/`5xx`.

**Design:** "Edited" badge = Blue/brand family small badge (`background:
Blue 50 #E7EFFC`, `border: Blue 200 #92B7F0`, `text: Blue 700 #0D469E`),
same Semantic Status Badge shape as confidence badges but in the brand color,
visually distinguishing "user changed this" from "AI confidence level."

**Edge cases:** edit attempted while `contract.status === 'processing'` →
block with "Processing in progress, try again shortly"; two tabs editing the
same term → last write wins (acceptable at MVP's single-user-per-contract
scale, no optimistic-locking needed).

---

## 7. Contract Chat

**Concern:** streamed, document-grounded Q&A with page citation and persistent history.

**Data model:** `chat_sessions` (1:1 with `contract_id`), `chat_messages`
(§12).

**DB tasks:** create both after `contracts` exists.

**API routes:**
| Method & Path | Request | Response |
|---|---|---|
| `GET /api/contracts/:id/chat` | — | `200 { session_id, messages }` (ascending, ≤200) |
| `POST /api/contracts/:id/chat` | `{ message: string }` (≤5000 chars) | `200` streamed `text/event-stream`; `404` if `contract.status !== 'completed'` |

**Prompt contract:**
- Model `gpt-4o`, `temperature: 0.4`, `max_tokens: 1000`, `stream: true`.
- Context per turn: full `contract_text` (≤15k tokens, no chunking) + full
  ascending history (≤200 messages) + system prompt:
  > "Answer only from the document text provided. If the answer is not in
  > the document, say so. Always cite the page number in the format [Page X].
  > Begin grounded answers with 'Based on the document…'."
- "I cannot find this in the document" is a valid, expected response — never
  logged or treated as a failure.

**Query classification (concrete heuristic, implemented in
`lib/ai/queryClassifier.ts`, zero extra API calls per PRD §7):**
```ts
function classifyQuery(message: string): 'contract' | 'history' | 'both' {
  const historyPatterns = /\b(earlier|you said|previously|before|last time|again)\b/i;
  const contractPatterns = /\b(clause|section|page|term|obligation|party|governing law|liability|indemnif)\b/i;
  const hasHistory = historyPatterns.test(message);
  const hasContract = contractPatterns.test(message);
  if (hasHistory && !hasContract) return 'history';
  if (hasContract && !hasHistory) return 'contract';
  return 'both';
}
```

**Streaming implementation:** OpenAI SDK async iterator → wrap chunks into a
`ReadableStream` → `new Response(stream, { headers: { 'Content-Type':
'text/event-stream' } })` → client reads via `fetch()` +
`response.body.getReader()` (POST body rules out `EventSource`). Persist the
user message immediately on send; persist the assistant message (with
`page_citation` parsed via `/\[Page (\d+)\]/`) once the stream completes.

**State management:** `lib/hooks/useChatStream.ts` — a `useMutation` that
performs the fetch+stream read, accumulates chunks in local state for live
rendering, then calls `queryClient.setQueryData` to merge the final message
into the cached chat history on completion.

**Components:** `components/chat/{ChatPanel,ChatMessage,ChatInput}.tsx`.

**Design:** user message bubble = Blue 50 background, right-aligned;
assistant bubble = Grey 25 background, left-aligned; both Paragraph Large
Medium (16px/500/24px); page-citation renders as a small clickable chip
using the same Semantic Status Badge shape in the Blue/brand family.

**Edge cases:** chat attempted before `status === 'completed'` → `404`
(indistinguishable from not-found, per the no-403 rule); message >5000 chars
→ `422` before any OpenAI call; OpenAI stream interrupted mid-response →
persist whatever was streamed so far with a `[truncated]` marker rather than
losing it silently (implementation note for Stage 4, not yet a DB column —
flag if this needs its own status field).

---

## 8. Dashboard & History

**Concern:** summary cards + sortable contract list.

**Data model:** reads `contracts` only — no new tables.

**API routes:**
| Method & Path | Request | Response |
|---|---|---|
| `GET /api/contracts` | query: `sort=date\|name\|type`, `order`, `page`, `pageSize` | `200 { items: ContractSummary[], total }` |
| `GET /api/dashboard/summary` | — | `200 { total, by_type: { NDA, MSA }, recent: ContractSummary[5] }` |

**State management:** TanStack Query, standard list/detail caching.

**Components:** `components/dashboard/{SummaryCards,ContractTable}.tsx`.

**Design:** cards = White surface, radius `8px` (Cards/panels rule); section
header = H5 Medium (24px/500/32px) per the Section Block pattern in
`docs/design.md`.

**Edge cases:** zero contracts → empty state "No contracts reviewed yet —
upload your first contract to begin"; last page of pagination with a partial
page → render normally, no special-casing needed since `total` is always
returned alongside `items`.

---

## 9. Feedback

**Concern:** thumbs up/down + optional comment, one per contract per user.

**Data model:** `user_feedback` table (§12), `UNIQUE(contract_id, user_id)`.

**API route:**
| Method & Path | Request | Response |
|---|---|---|
| `POST /api/contracts/:id/feedback` | `{ rating: 'up'\|'down', comment?: string }` | `200 { feedback }` — `ON CONFLICT (contract_id, user_id) DO UPDATE` |

**State management:** simple `useMutation` + toast on success.

**Design:** success toast = Green family (`background: Green 50, border:
Green 500, text: Green 700` per the State Colors table in `docs/design.md`).

**Edge cases:** comment >2000 chars → `422`; resubmission → upsert silently,
no "already submitted" error.

---

## 10. Export (Phase 2 — not built in Phase 1, spec'd to avoid rework)

**Concern:** CSV/PDF export of key terms. Deferred per `engineering-doc.md`'s
Phase 2 breakdown — route shape only, no schema changes required.

| Method & Path | Response |
|---|---|
| `GET /api/contracts/:id/export?format=csv` | `200` file stream, ≤5s |
| `GET /api/contracts/:id/export?format=pdf` | `200` file stream, ≤5s |

No DB, state, or component work scheduled until Phase 2 begins.

---

## 11. Infrastructure & Deployment

**Concern:** hosting platform constraints that affect route implementation now, even though deployment itself is Stage 6.

**Decision:** Netlify (per the PRD's own cost assumptions and this project's
Lab 3 deployment walkthrough), running the Next.js app via Netlify's Next.js
runtime adapter.

**Concrete constraint:** Netlify Functions default to a synchronous execution
limit in the same range as Vercel's Hobby tier (~10s). The PRD's 30s P95
extraction budget (`POST /api/contracts/:id/process`, which includes a GPT-4o
call budgeted up to 20s) exceeds this on a free/default tier. Two concrete
mitigations, either is acceptable, decide before Stage 6:
1. Upgrade to a Netlify plan/configuration that allows extended function
   duration for this specific route.
2. Restructure `/api/contracts/:id/process` as a Background Function
   (Netlify's async function type, no response-time ceiling), with the client
   polling `GET /api/contracts/:id` (already implemented per §4) for
   completion rather than awaiting the process call directly.

This is a function-timeout problem inherent to any serverless host at this
budget, not specific to Netlify — flagging now so it isn't rediscovered as a
production incident in Stage 6.

**Required env vars:** see §13 — all Supabase and OpenAI vars, plus no
Netlify-specific runtime env vars beyond what Netlify's build system sets
automatically.

---

## 12. Database Schema (SQL) — always-included, paste-and-run

Run this entire block once, in order, in the Supabase SQL Editor on a fresh
project. Covers extensions, enums, every table in dependency order, FKs,
indexes, `updated_at` triggers, RLS, and the Storage bucket.

```sql
-- ============================================================
-- Drop existing schema objects first (ContractIQ dev project only --
-- safe reset: confirmed zero rows in every table, and this is a
-- project-specific convenience decision, not a general default --
-- see CLAUDEchecklist1.md item 9).
-- ============================================================
-- Note: raw DELETE on storage.objects/storage.buckets is blocked by
-- Supabase's storage.protect_delete() trigger (42501) -- must go through
-- the Storage API, not SQL. The bucket + its config are recreated
-- idempotently below via ON CONFLICT DO NOTHING, so no delete is needed.
drop policy if exists "contracts_storage_insert_own_folder" on storage.objects;
drop policy if exists "contracts_storage_select_own_folder" on storage.objects;
drop policy if exists "contracts_storage_delete_own_folder" on storage.objects;

drop table if exists public.feedback cascade;
drop table if exists chat_messages cascade;
drop table if exists chat_sessions cascade;
drop view if exists term_corrections cascade;
drop table if exists extracted_key_terms cascade;
drop table if exists custom_key_terms cascade;
drop table if exists user_feedback cascade;
drop table if exists contracts cascade;
drop table if exists profiles cascade;

drop function if exists enforce_max_custom_terms() cascade;
drop function if exists handle_new_user() cascade;
drop function if exists set_updated_at() cascade;

drop type if exists contract_type_enum cascade;
drop type if exists contract_status_enum cascade;
drop type if exists chat_role_enum cascade;
drop type if exists feedback_rating_enum cascade;

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
create type contract_type_enum   as enum ('NDA', 'MSA');
create type contract_status_enum as enum ('uploaded', 'processing', 'completed', 'error');
create type chat_role_enum       as enum ('user', 'assistant');
create type feedback_rating_enum as enum ('up', 'down');

-- ============================================================
-- Shared trigger function for updated_at
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- profiles
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- contracts
-- ============================================================
create table contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_filename text not null,
  contract_type contract_type_enum not null,
  detected_contract_type contract_type_enum,
  status contract_status_enum not null default 'uploaded',
  error_message text,
  contract_text text,
  page_count int check (page_count > 0 and page_count <= 20),
  file_size_bytes bigint not null check (file_size_bytes <= 10485760),
  file_path text,
  last_accessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create index idx_contracts_user_id_created_at on contracts (user_id, created_at desc);
create index idx_contracts_status on contracts (status);

create trigger contracts_set_updated_at
  before update on contracts
  for each row execute function set_updated_at();

alter table contracts enable row level security;

create policy "contracts_select_own" on contracts for select using (auth.uid() = user_id);
create policy "contracts_insert_own" on contracts for insert with check (auth.uid() = user_id);
create policy "contracts_update_own" on contracts for update using (auth.uid() = user_id);
create policy "contracts_delete_own" on contracts for delete using (auth.uid() = user_id);

-- ============================================================
-- custom_key_terms
-- ============================================================
create table custom_key_terms (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  term_name text not null check (char_length(term_name) between 2 and 100),
  created_at timestamptz not null default now()
);

create index idx_custom_key_terms_contract_id on custom_key_terms (contract_id);

alter table custom_key_terms enable row level security;

create policy "custom_key_terms_select_own" on custom_key_terms for select using (auth.uid() = user_id);
create policy "custom_key_terms_insert_own" on custom_key_terms for insert with check (auth.uid() = user_id);
create policy "custom_key_terms_delete_own" on custom_key_terms for delete using (auth.uid() = user_id);

create or replace function enforce_max_custom_terms()
returns trigger as $$
begin
  if (select count(*) from custom_key_terms where contract_id = new.contract_id) >= 5 then
    raise exception 'MAX_CUSTOM_TERMS: a contract may have at most 5 custom key terms';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger custom_key_terms_enforce_max
  before insert on custom_key_terms
  for each row execute function enforce_max_custom_terms();

-- ============================================================
-- extracted_key_terms
-- ============================================================
create table extracted_key_terms (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  custom_key_term_id uuid references custom_key_terms(id) on delete set null,
  is_manual boolean not null default false,
  term_name text not null,
  value text not null,
  page_number int not null check (page_number >= 1),
  confidence_score numeric(5,2) not null check (confidence_score between 0 and 100),
  source_sentence text not null,
  is_edited boolean not null default false,
  original_ai_value text,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_extracted_key_terms_contract_id on extracted_key_terms (contract_id);
create index idx_extracted_key_terms_confidence on extracted_key_terms (confidence_score);

create trigger extracted_key_terms_set_updated_at
  before update on extracted_key_terms
  for each row execute function set_updated_at();

alter table extracted_key_terms enable row level security;

create policy "extracted_key_terms_select_own" on extracted_key_terms for select using (auth.uid() = user_id);
create policy "extracted_key_terms_insert_own" on extracted_key_terms for insert with check (auth.uid() = user_id);
create policy "extracted_key_terms_update_own" on extracted_key_terms for update using (auth.uid() = user_id);
create policy "extracted_key_terms_delete_own" on extracted_key_terms for delete using (auth.uid() = user_id);

-- ============================================================
-- term_corrections (view, not a table)
-- ============================================================
create view term_corrections with (security_invoker = true) as
select
  ekt.id               as term_id,
  ekt.contract_id,
  ekt.user_id,
  c.contract_type,
  ekt.term_name,
  ekt.original_ai_value,
  ekt.value            as corrected_value,
  ekt.confidence_score,
  ekt.edited_at
from extracted_key_terms ekt
join contracts c on c.id = ekt.contract_id
where ekt.is_edited = true;

-- ============================================================
-- chat_sessions
-- ============================================================
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger chat_sessions_set_updated_at
  before update on chat_sessions
  for each row execute function set_updated_at();

alter table chat_sessions enable row level security;

create policy "chat_sessions_select_own" on chat_sessions for select using (auth.uid() = user_id);
create policy "chat_sessions_insert_own" on chat_sessions for insert with check (auth.uid() = user_id);

-- ============================================================
-- chat_messages
-- ============================================================
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role chat_role_enum not null,
  content text not null check (char_length(content) <= 5000),
  page_citation int,
  created_at timestamptz not null default now()
);

create index idx_chat_messages_session_created on chat_messages (session_id, created_at asc);

alter table chat_messages enable row level security;

create policy "chat_messages_select_own" on chat_messages for select using (auth.uid() = user_id);
create policy "chat_messages_insert_own" on chat_messages for insert with check (auth.uid() = user_id);

-- ============================================================
-- user_feedback
-- ============================================================
create table user_feedback (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating feedback_rating_enum not null,
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  unique (contract_id, user_id)
);

alter table user_feedback enable row level security;

create policy "user_feedback_select_own" on user_feedback for select using (auth.uid() = user_id);
create policy "user_feedback_upsert_own" on user_feedback for insert with check (auth.uid() = user_id);
create policy "user_feedback_update_own" on user_feedback for update using (auth.uid() = user_id);

-- ============================================================
-- Storage: contracts bucket
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contracts', 'contracts', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "contracts_storage_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'contracts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "contracts_storage_select_own_folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'contracts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "contracts_storage_delete_own_folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'contracts' and auth.uid()::text = (storage.foldername(name))[1]);
```

> **Not created here, reserved for Stage 7:** `rate_limit_events` is owned by
> `skills/security-foundation/SKILL.md` — do not add it in this schema run.

---

## 13. Environment Variables (`.env.example`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=              # Project URL — Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # anon/public key — Project Settings > API
SUPABASE_SERVICE_ROLE_KEY=             # service role key — Project Settings > API # SERVER ONLY, never expose to client

# OpenAI
OPENAI_API_KEY=                        # OpenAI API key — platform.openai.com/api-keys # SERVER ONLY

# App
NEXT_PUBLIC_APP_URL=                   # e.g. http://localhost:3000 in dev, the Netlify URL in production
```

Rules applied: values left empty (this is `.env.example`), grouped by
service with a header comment, `# SERVER ONLY` on both Supabase and OpenAI
secret keys, every service mentioned anywhere in `engineering-doc.md`
covered (Supabase, OpenAI — no other third-party services are used at MVP).

---

## Summary of Specs Produced

| Section | Specifies |
|---|---|
| 1. Auth & Session Management | Signup/login/logout flow, `profiles` table, route contracts |
| 2. Contract Upload & Text Extraction | `contracts` table, pdf-parse pipeline, Storage non-blocking upload |
| 3. Custom Key Terms | `custom_key_terms` table, ≤5 enforcement |
| 4. Key Term Extraction (AI) | `extracted_key_terms` table, GPT-4o prompt/schema/retry contract |
| 5. Results Display | Viewer + Key Terms Panel components, confidence badge thresholds |
| 6. Inline Correction | `PATCH` contract, original-value retention |
| 7. Contract Chat | Streaming contract, query classifier, grounding prompt |
| 8. Dashboard & History | List/summary API contracts |
| 9. Feedback | Upsert contract |
| 10. Export (Phase 2) | Route shape only, deferred |
| 11. Infrastructure & Deployment | Netlify function-duration constraint + two concrete mitigations |
| 12. Database Schema (SQL) | Complete paste-and-run schema — always included |
| 13. Environment Variables | Complete `.env.example` — always included |
