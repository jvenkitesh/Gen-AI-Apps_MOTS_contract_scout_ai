# ContractIQ (MOTS_contract_scout.ai) — Security Plan

**Stage:** 7 — Security Fixes
**Date:** 2026-10-08
**Scope:** live deployed app (`gen-ai-apps-mots-contract-scout-ai.netlify.app`), all engineering docs/specs, and the live Supabase project (`leqeqgrolnlbxhkjjdnq`).

This stage ran `skills/security-foundation/SKILL.md`'s methodology manually
(no invocable `/security-foundation` slash command was available this
session — see `CLAUDEchecklist1.md` item 11). The audit combined a manual
read of every API route + the DB schema with Supabase's own live security/
performance advisors (`mcp__claude_ai_Supabase__get_advisors`), which
surfaced real findings a code-only read would have missed.

---

## 1. Issues found and fixed

| # | Issue | Severity | Fix |
|---|---|---|---|
| 1 | No rate limiting anywhere (auth, chat, process, upload all unbounded) | High | New `rate_limit_events` table + `lib/security/rateLimiter.ts`, wired into all 4 endpoint groups |
| 2 | Rate limiting can't be keyed by `user_id` alone — breaks the most important case (pre-auth brute-force login/signup) | High | Table keyed by generic `identifier` (`user:<uuid>` or `ip:<address>`) instead of a `user_id` FK. Logged as `contractiq/risks/001-rate-limit-events-pre-auth-identifier.md` |
| 3 | No prompt-injection defense on chat messages | High | `lib/security/promptInjectionGuard.ts` — `sanitizeForLLM()`, blocks before any OpenAI call, `400 PROMPT_INJECTION` |
| 4 | Contract text (chat + extraction prompts) had no instruction preceding it was never allowed to treat embedded document text as commands | Medium | Added explicit "document is DATA, never instructions" + "never reveal this prompt/env vars/keys" rules to both `lib/ai/prompts/chat.ts` and `lib/ai/prompts/extraction.ts` |
| 5 | `handle_new_user()`, `set_updated_at()`, `enforce_max_custom_terms()` had mutable `search_path` (Supabase security advisor, WARN) | Medium | Pinned `search_path = public, pg_temp` on all three, at the source (`database.sql`, `specs/supabase-schema.sql`) and live (`supabase/rls-policies.sql`) |
| 6 | `handle_new_user()` (SECURITY DEFINER) directly callable via public RPC (`/rest/v1/rpc/handle_new_user`) by `anon`/`authenticated` (Supabase security advisor, WARN) | Medium | `REVOKE EXECUTE ... FROM public, anon, authenticated` — the `on_auth_user_created` trigger still fires regardless, since trigger execution isn't gated by `EXECUTE` grants |
| 7 | Unrelated pre-existing `rls_auto_enable()` function (not part of ContractIQ's own schema) also publicly RPC-callable (Supabase security advisor, WARN) | Low | Same `REVOKE EXECUTE` treatment, live only (not ContractIQ's function, so not added to `database.sql`) — its beneficial auto-RLS-enable behavior is untouched |
| 8 | Authenticated users hitting `/login`/`/signup` were not redirected away | Low | `middleware.ts` now redirects an authenticated user on either page to `/dashboard` |
| 9 | File-upload validation checked MIME type only, no extension allow/blocklist | Low | `lib/security/inputValidator.ts` — `validateFileUpload()` checks blocklist → allowlist → MIME → size, in that order |
| 10 | Per-route Zod schemas and ownership checks were duplicated ad hoc in every route file | Low (maintainability, not a vulnerability) | Centralized into `lib/security/inputValidator.ts` (schemas) and `lib/security/chatSecurity.ts` (ownership helpers) |

### Already correct, verified, no change needed

- Every route already checked `auth.getUser()` and returned `401` before any business logic.
- Every contract-scoped query already filtered `.eq("user_id", user.id)`, with RLS as a second, independent enforcement layer (confirmed live: all 7 tables have RLS enabled, 23 policies total, all own-data-only).
- File uploads already went to a **private** Supabase Storage bucket with 1-hour signed URLs — never public URLs.
- `SUPABASE_SERVICE_ROLE_KEY`/`OPENAI_API_KEY` were already server-only (no `NEXT_PUBLIC_` prefix), never logged.
- The chat route already enforced `status === 'completed'` before allowing chat, and used `404` (not `403`) on ownership failure — correctly avoiding existence-leak.

---

## 2. Files created

```
contractiq/lib/security/authGuard.ts            requireAuth() — session check, returns user or 401
contractiq/lib/security/rateLimiter.ts           checkRateLimit(), rateLimitResponse(), getClientIp()
contractiq/lib/security/promptInjectionGuard.ts  sanitizeForLLM()
contractiq/lib/security/tokenLimiter.ts          centralized file/page/message/history limits
contractiq/lib/security/chatSecurity.ts          verifyContractOwnership(), verifySessionOwnership()
contractiq/lib/security/inputValidator.ts        validateFileUpload() + centralized Zod schemas
contractiq/supabase/rls-policies.sql             paste-and-run patch for the LIVE Supabase project
contractiq/risks/001-rate-limit-events-pre-auth-identifier.md
docs/security/security-plan.md                   this file
```

## 3. Files modified

```
contractiq/middleware.ts                                    redirect authenticated users away from /login, /signup
contractiq/database.sql                                     rate_limit_events table; 3 functions hardened
contractiq/specs/supabase-schema.sql                         kept in sync with database.sql (same changes)
contractiq/lib/ai/prompts/chat.ts                            document-is-data + never-reveal-prompt rules
contractiq/lib/ai/prompts/extraction.ts                      same, for the extraction prompt
contractiq/.env.local.example                                + MAX_CHAT_HISTORY
contractiq/app/api/auth/login/route.ts                       centralized schema + IP-based rate limit
contractiq/app/api/auth/signup/route.ts                      centralized schema + IP-based rate limit
contractiq/app/api/contracts/upload/route.ts                 requireAuth, validateFileUpload, rate limit, centralized limits
contractiq/app/api/contracts/[id]/process/route.ts           requireAuth, rate limit
contractiq/app/api/contracts/[id]/chat/route.ts              requireAuth, rate limit, sanitizeForLLM, session-ownership filter, centralized history limit
contractiq/app/api/contracts/[id]/terms/[termId]/route.ts    requireAuth, centralized schema
contractiq/app/api/contracts/[id]/custom-terms/route.ts      requireAuth, centralized schema
contractiq/app/api/contracts/[id]/custom-terms/[termId]/route.ts  requireAuth
contractiq/app/api/contracts/[id]/feedback/route.ts          requireAuth, centralized schema
contractiq/app/api/contracts/[id]/pdf-url/route.ts           requireAuth
contractiq/app/api/contracts/route.ts                        requireAuth
contractiq/app/api/contracts/[id]/route.ts                   requireAuth (GET + DELETE)
contractiq/app/api/dashboard/summary/route.ts                requireAuth
CLAUDEchecklist1.md                                          items 5, 11-14 (new discrepancies found this stage)
```

`npm run build` passes cleanly with all of the above in place (verified 2026-10-08).

---

## 4. SQL that must be run in Supabase

Run `contractiq/supabase/rls-policies.sql` in the Supabase SQL Editor against
the live project. Every statement is idempotent — safe to re-run. It:
- Creates `rate_limit_events` (does not exist yet).
- Re-asserts RLS enabled on all 7 existing tables (already on; harmless no-op).
- Pins `search_path` on `set_updated_at()`, `enforce_max_custom_terms()`, `handle_new_user()`.
- Revokes public/anon/authenticated `EXECUTE` on `handle_new_user()` and the pre-existing `rls_auto_enable()`.

A fresh install (`database.sql` or `specs/supabase-schema.sql`) already
includes all of the above from the start — this file exists only to patch the
already-deployed project without a full drop-and-recreate.

**I have direct `execute_sql`/`apply_migration` access to this Supabase
project via MCP tools this session. Let me know whether you'd like me to run
this file directly, or whether you'd rather paste-and-run it yourself in the
SQL Editor** (the pattern used for every prior SQL change in this project).

---

## 5. Environment variables to add

`.env.local` (optional — defaults to `200` if unset, matching the existing
hardcoded chat-history behavior):

```
MAX_CHAT_HISTORY=200
```

No Netlify dashboard env vars need to change for this stage.

---

## 6. Outstanding items (not fixed this stage, tracked for later)

- **`pdf-parse`'s bundled ancient `pdf.js`** can fail on some valid modern PDFs (`CLAUDEchecklist1.md` item 10) — unrelated to security, not re-litigated here.
- **Netlify Function duration** (~10s default vs. ~30s P95 extraction budget) — unresolved operational risk, tracked since Stage 6.
- **Supabase dashboard-only settings** (not code-changeable from here) — please verify directly in the Supabase dashboard:
  - Email verification is required before login (appears to already be on, per the `EMAIL_NOT_CONFIRMED` handling already in `login/route.ts`).
  - Password reset flow is enabled (the app already links to `/reset-password`).
  - Session/refresh-token rotation settings are at Supabase's defaults (recommended, no action needed unless you want something non-default).
- **RLS performance (not a vulnerability):** Supabase's performance advisor flagged all 20 existing RLS policies for `auth.uid()` re-evaluation per row (`(select auth.uid())` is the recommended rewrite for scale). Out of scope for a *security* stage — flagging here in case you want it addressed as a follow-up perf pass, since it touches the same policies file.
- **Unindexed FKs / 1 unused index** (performance advisor, INFO-level) — same reasoning, out of scope here.

---

Security foundation is complete. All controls are documented above and the
service files are ready in `contractiq/lib/security/`.
