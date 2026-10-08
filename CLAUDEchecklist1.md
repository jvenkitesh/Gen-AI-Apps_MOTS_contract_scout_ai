# Checklist 1 — Documentation Gaps to Fix at End of Project

Running list of inconsistencies found between this project's `CLAUDE.md` /
`skills/*/SKILL.md` files and either each other, or the actual reference lab
materials (`initmahesh/MLAI-community-labs`, cohort-10/week-5) this project
is built from — plus any of our own pending follow-through on decisions made
along the way. Not fixed as they're found — tracked here and cleaned up in
one pass once the build is further along, so we don't thrash on process docs
mid-build.

Each item has two independent checkboxes:
- **Worked around this session** — did we get unblocked and keep moving?
- **Fixed at the source** — has the underlying file (`CLAUDE.md`, a
  `SKILL.md`, `engineering-doc.md`, etc.) actually been corrected?

---

## 1. `docs/engineering/implementation-specs.md` has no skill backing it

- Worked around this session: **yes**
- Fixed at the source: **no**

`CLAUDE.md` (Stage 1 section, and the Docs Reference table) attributes
`docs/engineering/implementation-specs.md` to the `/engineering-planner`
skill and describes its contents as "one detailed spec block per feature
(user flow, DB schema, DB tasks, API routes, state management, component
spec, design, edge cases)".

But `skills/engineering-planner/SKILL.md` itself — frontmatter, Steps, and
Output section — only ever defines `docs/engineering/engineering-doc.md` as
its output. `implementation-specs.md` is not mentioned anywhere in that
skill file.

**Not a local mistake** — confirmed identical in the upstream starter repo
`sachin0034-tech/dev-os` (same `CLAUDE.md` text, same gap in the same skill
file). The actual reference lab also never shows this file being produced as
a Stage 1 artifact at all (see item 2).

So as written, nothing in this repo's skill files ever actually produces
`docs/engineering/implementation-specs.md`. Running Stage 1 by just invoking
`/engineering-planner` and stopping when it finishes will not create this
file, and Lab 2's own prerequisite check ("you need both files before
starting this lab") will silently fail later.

**Fix later:** either add an explicit section to
`skills/engineering-planner/SKILL.md` defining this file's output structure,
or remove the `implementation-specs.md` deliverable from `CLAUDE.md`'s Stage
1 if it's decided not to keep producing it going forward.

### The exact prompt used to work around it

Since no skill defines `implementation-specs.md`'s structure, we borrowed
`skills/implementation-specs/SKILL.md`'s *methodology* (normally used for
Stage 2's `specs/*.md`) and pointed it at a single file instead. Reuse this
prompt on a future project built from this same template, once
`docs/engineering/engineering-doc.md` already exists and is approved:

```
Create docs/engineering/implementation-specs.md based on the methodology in
skills/implementation-specs/SKILL.md:
- Read docs/engineering/engineering-doc.md in full.
- Identify every distinct concern in it -- features, integrations, user
  roles, data models, flows, infrastructure decisions.
- Write a self-contained, concrete, runnable-where-applicable spec section
  for each concern (no "TBD", no "as needed") -- but as sections within ONE
  file (docs/engineering/implementation-specs.md), not the skill's usual
  docs/specs/*.md multi-file output.
- For each feature/concern, cover what CLAUDE.md's Stage 1 description
  requires: user flow, DB schema (reference the engineering doc's full DDL,
  don't re-paste it), DB tasks (setup order), API routes (method/path/
  request/response/validation), state management, component spec, a design
  note grounded in an actual docs/design.md token, and edge cases.
- Always include, regardless of what else is generated: a complete,
  paste-and-run Supabase SQL schema section (extensions, enums, every table
  in dependency order, FKs, indexes, updated_at triggers, RLS + policies,
  storage bucket + policies) and a complete .env.example section (every var,
  grouped by service, # SERVER ONLY markers on secrets).
- Do not ask clarifying questions -- the engineering doc already resolved
  every decision.
- End with a summary table listing each section and one sentence describing
  what it specifies.
```

**Where the output landed:** `docs/engineering/implementation-specs.md` (13
sections: 9 per-feature specs + full SQL schema + `.env.example` content).

---

## 2. `CLAUDE.md` conflates two differently-scoped "implementation specs" artifacts

- Worked around this session: **yes** — both artifacts now exist, intentionally, side by side
- Fixed at the source: **no**

The actual lab materials (`01-Planning-and-Architecture-Lab/02-skills-and-design-system/readme.md`,
the "5 skills" walkthrough) describe `/implementation-specs` as:
- *Run in Lab 2, Lesson 1* (not Lab 1)
- *Saves everything to `specs/`* (a multi-file output, not a single
  `docs/engineering/implementation-specs.md` file)

So the lab's own mental model treats "Implementation Specs" as what our
`CLAUDE.md` calls **Stage 2**, not a second Stage 1 deliverable. `CLAUDE.md`
ends up naming two different things almost identically:
- `docs/engineering/implementation-specs.md` — Stage 1, attributed to
  `engineering-planner`, no real skill support (item 1)
- `contractiq/specs/*.md` — Stage 2, actually implemented by
  `skills/implementation-specs/SKILL.md` (we followed the lesson's own
  demonstrated location, `specs/` inside the scaffolded app, rather than the
  skill file's literal `docs/specs/` path)

Both now exist in this project and are not duplicates — the first is a
consolidated architecture-level companion to `engineering-doc.md`; the
second is granular, per-feature, code-facing specs meant to be read file by
file while building.

**Fix later:** rename one of these two artifacts so they're not confusable,
or drop the Stage-1 one entirely per the lab's actual flow.

---

## 3. Stage order doesn't match the lab's actual build order

- Worked around this session: **yes** — followed the lab's order
- Fixed at the source: **no**

`CLAUDE.md`: Stage 2 (Implementation Specs) → Stage 3 (Frontend Setup).

Actual lab (`02-Building-the-Application-Lab/01-building-the-application/readme.md`):
Prompt 1 scaffolds the Next.js frontend **first**, Prompt 2 generates specs
**second**, Prompt 3 implements, Prompt 4 generates the DB schema SQL last
(right before loading it into Supabase). We followed this order — the
`contractiq/` scaffold was created before `contractiq/specs/*.md` existed.

**Fix later:** re-order `CLAUDE.md`'s stages (or explicitly note Stage 2/3
can run in either order) to match how the lab actually sequences things.

---

## 4. `skills/implementation-specs/SKILL.md` names the wrong input file

- Worked around this session: **n/a** (didn't block us — we already knew the real input file)
- Fixed at the source: **no**

Its own frontmatter says: *"Takes the engineering plan document produced by
the engineering-planner skill (`docs/engineering-plan.md`)..."* — but
`skills/engineering-planner/SKILL.md` actually produces
`docs/engineering/engineering-doc.md`. Different path, different filename.

**Fix later:** correct the input filename reference in
`skills/implementation-specs/SKILL.md`.

---

## 5. Security output path disagreement

- Worked around this session: **yes — used `contractiq/lib/security/`**
- Fixed at the source: **no**

`CLAUDE.md`'s Stage 7 section says output includes `src/lib/security/`, but
this project's `skills/frontend-setup/SKILL.md` scaffolds a root-level
`app/` with no `src/` wrapper — implying the real path should be
`lib/security/` (no `src/`).

**Correction:** an earlier version of this checklist claimed this was also
flagged inside `docs/engineering/engineering-doc.md`'s Open Items — checked
directly, it is **not** (that section only has 7 items, none about this).
Tracked here only.

**Resolved at Stage 7 (2026-10-08):** confirmed no `src/` directory exists
anywhere in the app; all security files were written to
`contractiq/lib/security/`, matching every other `lib/*` module.

**Fix later:** drop the `src/` prefix in `CLAUDE.md`'s Stage 7 description.

---

## 6. Hosting platform: decided (Netlify), applied to `engineering-doc.md` at Stage 6

- Worked around this session: **yes**
- Fixed at the source: **yes, at the deploy step (see below)**

`CLAUDE.md` Stage 6 just says "Vercel, Supabase, etc." generically. The PRD
assumed Netlify; the actual Lab 3 deploys to Netlify specifically. We
designed `engineering-doc.md` around Vercel before reading Lab 3, then
agreed with the user to switch to Netlify, and a plan to revise
`engineering-doc.md` accordingly was approved.

**Fixed at Stage 6 (2026-10-08):** at the actual deploy step, asked the user
per the plan above; confirmed "yes, fix it now." `engineering-doc.md`'s 3
stale mentions (§6 Backend Architecture, the service diagram caption, Open
Items #5) are now updated to Netlify; the top decisions table keeps one
deliberate historical note explaining that an earlier draft considered
Vercel before Netlify was confirmed (context, not a stale claim).

**Fix later (process-doc level):** have `CLAUDE.md` (or the
`frontend-setup`/`engineering-planner` skill) name Netlify explicitly, since
that's what Lab 3 actually walks through, instead of saying "Vercel,
Supabase, etc." generically.

---

## 7. `README.md`'s stale AI provider mention

- Worked around this session: **n/a**
- Fixed at the source: **no**

This project's own `README.md` mentions "Anthropic Claude API" as the AI
provider, which conflicts with the PRD's explicit and detailed OpenAI GPT-4o
requirement. Appears to be leftover boilerplate from the `dev-os` template.

**Fix later:** update `README.md` to reflect OpenAI as the actual provider,
or confirm/remove the stale mention.

---

## 8. `skills/frontend-setup/SKILL.md` scaffolds a generic placeholder, not a ContractIQ-specific structure

- Worked around this session: **yes**
- Fixed at the source: **no**

The skill's own Steps only produce a bare "Hello, Next.js" landing page (6
files: config + `app/layout.tsx`/`globals.css`/`page.tsx`) — no Tailwind
setup, no Supabase client, no route groups, no design-system integration —
despite `CLAUDE.md`'s Stage 3 description saying to scaffold "based on the
folder structure and conventions defined in the specs." We extended the
scaffold manually (Tailwind + design tokens, `(auth)`/`(app)` route groups,
`lib/supabase/*`, `middleware.ts`, base UI primitives) to match
`engineering-doc.md` §11 and the lesson's own demonstrated result, rather
than following the skill file literally.

**Fix later:** update `skills/frontend-setup/SKILL.md` to read
`docs/engineering/engineering-doc.md`'s folder structure and actually
scaffold it, instead of a generic single-page template.

---

## 9. `database.sql` is destructive (drop-then-create) — a ContractIQ-specific exception, not a general template rule

- Worked around this session: **yes**
- Fixed at the source: **n/a — this is a deliberate, documented exception, not a bug**

When the user tried running `contractiq/database.sql` in the Supabase SQL
Editor, the tables already existed (confirmed via a direct read-only
`list_tables` query against the live project: all 9 expected tables, all 4
enum types with correct values, matching columns/CHECKs/FKs — all at 0 rows).
The original script used plain `CREATE TABLE`/`CREATE TYPE` with no
`IF NOT EXISTS`/guards, so it failed on "already exists" errors. (The user
initially suspected missing enums; direct inspection showed the enums were
actually already correct — the real cause was the unguarded `CREATE`
statements.)

**Decision:** since this is a greenfield dev project with zero real data,
`database.sql` (and its two synced copies — `contractiq/specs/supabase-schema.sql`
and the embedded SQL in `docs/engineering/implementation-specs.md` §12) now
start with a `DROP ... CASCADE` block covering all 9 of our own objects plus
one unrelated leftover table (`public.feedback`, confirmed safe to drop),
before running the original `CREATE` logic unchanged. This guarantees a
known-correct schema state in one run.

**This is a project-specific convenience decision, not a safe general
default.** For any other product built from this same
`skills/implementation-specs/SKILL.md` template:

> **A destructive drop-and-recreate approach must never be the silent
> default** when a future project finds existing tables in its target
> database. The assistant must stop and ask the user what they want to do —
> verify-and-patch (inspect what's actually missing, patch only the gap),
> drop-and-recreate (if data loss is confirmed acceptable), or rewrite the
> script to be idempotent (`CREATE TABLE IF NOT EXISTS`, guarded
> `CREATE TYPE`, `DROP ... IF EXISTS` before `CREATE TRIGGER`/`CREATE POLICY`)
> — before writing or re-running any schema SQL that touches objects that
> might already exist. Never assume "drop first" is safe just because it
> worked for ContractIQ's empty dev database.

**Fix later:** consider adding this explicit "ask before assuming" instruction
directly into `skills/implementation-specs/SKILL.md`'s "Always include:
supabase-schema.sql" section, so a future session is prompted to ask
automatically instead of relying on a human/session noticing the conflict.

---

## 10. `pdf-parse`'s bundled `pdf.js` is very old and can fail on some valid PDFs

- Worked around this session: **yes — the failure is now a clean 422, not a crash**
- Fixed at the source: **no — tracked as a known risk, not yet resolved**

While testing the Upload feature (`app/api/contracts/upload/route.ts`), a
genuinely valid PDF (generated with `pdf-lib`, a modern, spec-compliant
library) failed to parse via `pdf-parse`, throwing an uncaught exception
that crashed the route with a raw 500. The real underlying cause: `pdf-parse`
bundles its own copy of `pdf.js` at **v1.10.100** (circa 2017), which doesn't
understand some stream compression variants modern PDF tools use — the dev
log showed `FormatError: Unknown compression method in flate stream: 48, 56`.

Two separate things came out of this:
1. **Fixed now:** `extractContractText()` calls in the upload route are
   wrapped in try/catch, so any unparseable PDF (corrupt, malformed, or just
   using a stream encoding this old pdf.js can't handle) now returns a clean
   `422 UNREADABLE_PDF` with a user-facing message, instead of an uncaught
   500. This was a real gap — a corrupted/unusual real-world PDF upload
   would previously have crashed the request entirely.
2. **Not fixed, tracked as a risk:** the underlying old-`pdf.js` limitation
   remains. One real-world sample contract (`test_contracts/Aurelios System
   NDA 1.pdf`) parsed perfectly, so this isn't a blanket failure — but some
   fraction of real uploads (depending on what tool generated them: certain
   Adobe/DocuSign/export settings, etc.) could hit this same incompatibility
   and get rejected as "unreadable" even though the PDF is perfectly valid.

**Fix later (if this becomes a real problem with actual user uploads):**
replace `pdf-parse` with a current, actively-maintained PDF text extraction
path — e.g. use `pdfjs-dist` directly (a recent version) instead of the
ancient copy `pdf-parse` bundles, or evaluate `unpdf`/`pdf2json`. This was
originally chosen because the PRD's Technical Requirements table names
"pdf-parse (Node.js)" explicitly — any replacement should preserve the same
`[PAGE N]`-marker extraction contract (`lib/pdf/extractText.ts`'s current
interface) so nothing downstream needs to change.

---

## 11. `skills/security-foundation/SKILL.md` has no invocable `/security-foundation` slash command

- Worked around this session: **yes — read the skill file directly and followed it manually**
- Fixed at the source: **no**

Same gap pattern as item 1: `CLAUDE.md`'s Stage 7 names `/security-foundation`
as the skill to run, and the file exists at
`skills/security-foundation/SKILL.md` with a full, well-specified methodology
— but it isn't registered as an invocable skill in this session (`Skill` tool
returned "Unknown skill: security-foundation"). Read the file directly and
followed its Steps/Requirements/Deliverables manually instead.

**Fix later:** investigate why repo-local `skills/*/SKILL.md` files aren't
being picked up as invocable slash commands at all in this environment (true
for every skill in this project, not just this one) — may be an environment/
plugin-registration issue rather than anything wrong with the skill files
themselves.

---

## 12. `supabase/rls-policies.sql` path disagreement

- Worked around this session: **yes — used `contractiq/supabase/rls-policies.sql`**
- Fixed at the source: **no**

`CLAUDE.md`'s Stage 7 output and Docs Reference table both list
`supabase/rls-policies.sql` unprefixed, implying repo root — but every other
SQL/spec artifact in this project lives under `contractiq/` (`database.sql`,
`specs/supabase-schema.sql`). Placed it at `contractiq/supabase/rls-policies.sql`
for consistency with that established convention.

**Fix later:** prefix this path with `contractiq/` in `CLAUDE.md`'s Stage 7
section and Docs Reference table.

---

## 13. `security-foundation` skill's `inputValidator.ts` deliverable assumes a `lib/utils/validation.ts` that was never created

- Worked around this session: **yes**
- Fixed at the source: **no**

The skill's own Deliverables table describes `inputValidator.ts` as
`validateFileUpload() + re-exports all Zod schemas from lib/utils/validation.ts`
— implying per-route Zod schemas already live in a separate
`lib/utils/validation.ts` file from an earlier stage. No such file was ever
created (Stage 2/4 left each route's Zod schema defined inline, per-file).
Centralized the existing inline schemas directly into
`lib/security/inputValidator.ts` instead of adding an extra, currently-pointless
re-export indirection layer.

**Fix later:** either have an earlier stage's skill (`implementation-specs` or
`frontend-setup`) actually produce `lib/utils/validation.ts`, or drop the
re-export-indirection wording from `security-foundation`'s deliverable table.

---

## 14. `security-foundation` skill's generic templates don't match this app's actual scope

- Worked around this session: **yes — followed actual app capability, not the skill's generic examples**
- Fixed at the source: **no**

Three places where the skill's template is a generic example, not something to
apply literally:
- **Allowed file types:** skill says `.pdf, .docx`; this app's extraction
  pipeline (`lib/pdf/extractText.ts`) is PDF-only via `pdf-parse` — allowing
  `.docx` uploads would accept files the app cannot process. Scoped
  `validateFileUpload()` to `.pdf` only.
- **Protected route list:** skill lists `/chat` and `/profile`; neither exists
  as a standalone route in this app (chat is nested under `/contracts/[id]`,
  already covered; there is no `/profile`, only `/settings`). Left
  `middleware.ts`'s matcher as `/dashboard`, `/contracts`, `/settings` (already
  correct) plus the new `/login`/`/signup` redirect-when-authenticated logic.
- **Token/usage limit defaults:** skill's example table suggests 200 max pages
  and a `MAX_CHAT_HISTORY` default of 100; this app's real, already-approved
  limits are 20 pages (PRD FR-02) and a long-standing hardcoded `.limit(200)`
  chat history fetch. Centralized the app's actual values in
  `lib/security/tokenLimiter.ts` rather than silently changing established
  behavior to match the skill's generic placeholder numbers.

**Fix later:** none needed — these are expected, template-vs-actual-app
divergences, not bugs. Noting here only so a future session doesn't assume the
skill's literal example values/lists are this app's real requirements.

---

*Add to this list as more gaps surface during the build — don't stop to fix
them individually, except where noted above as "fix now."*
