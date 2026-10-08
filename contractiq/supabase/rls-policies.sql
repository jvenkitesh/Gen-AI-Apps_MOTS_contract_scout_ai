-- ContractIQ -- Stage 7 security hardening. Paste-and-run in the Supabase
-- SQL Editor against the already-deployed project. Every statement is
-- idempotent and safe to re-run.
--
-- This file patches the LIVE database in place. It does not replace
-- database.sql / specs/supabase-schema.sql -- those are the source of truth
-- for a fresh install and already include everything below (so a future
-- fresh install needs no separate patch step).
--
-- Findings are from a live audit via Supabase's own security/performance
-- advisors (mcp__claude_ai_Supabase__get_advisors) run against this project
-- on 2026-10-08, cross-checked against database.sql.

-- ============================================================
-- 1. rate_limit_events -- did not exist yet (reserved for this stage).
--    Service-role-only: no RLS policies, so only createAdminClient()
--    (bypasses RLS) can read/write it.
--
--    `identifier` is a generic string ("user:<uuid>" or "ip:<address>"),
--    not a strict FK to auth.users: the Authentication limit (10/min) must
--    rate-limit PRE-auth requests (failed logins, signups), where there is
--    often no valid user_id yet -- a user_id-only design (the skill's own
--    literal template) cannot represent that case at all.
-- ============================================================
create table if not exists rate_limit_events (
  id         uuid        primary key default gen_random_uuid(),
  identifier text        not null,
  action     text        not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_rate_limit_events_lookup
  on rate_limit_events (identifier, action, created_at desc);
alter table rate_limit_events enable row level security;

-- ============================================================
-- 2. Idempotent RLS re-assertion for every existing table. All 7 already
--    had RLS enabled (confirmed live), but re-asserting here is harmless
--    and matches the skill's required deliverable shape.
-- ============================================================
alter table profiles             enable row level security;
alter table contracts            enable row level security;
alter table custom_key_terms     enable row level security;
alter table extracted_key_terms  enable row level security;
alter table chat_sessions        enable row level security;
alter table chat_messages        enable row level security;
alter table user_feedback        enable row level security;

-- ============================================================
-- 3. Function hardening -- Supabase security advisor findings:
--    "Function Search Path Mutable" (WARN) on all three, plus
--    "Public Can Execute SECURITY DEFINER Function" (WARN) on
--    handle_new_user(). Pinning search_path closes a schema-shadowing
--    privilege-escalation vector; revoking EXECUTE on handle_new_user()
--    closes an unintended public RPC endpoint
--    (/rest/v1/rpc/handle_new_user) -- the on_auth_user_created trigger
--    still fires regardless, since trigger execution isn't gated by
--    EXECUTE grants.
-- ============================================================
alter function set_updated_at()           set search_path = public, pg_temp;
alter function enforce_max_custom_terms() set search_path = public, pg_temp;
alter function handle_new_user()          set search_path = public, pg_temp;
revoke execute on function handle_new_user() from public, anon, authenticated;

-- ============================================================
-- 4. rls_auto_enable() -- a pre-existing, project-level DDL event trigger
--    (not part of ContractIQ's own schema/database.sql) that auto-enables
--    RLS on any new table created in the public schema. Its search_path is
--    already pinned correctly. It was flagged only because it is also
--    directly callable via /rest/v1/rpc/rls_auto_enable by anon/
--    authenticated. Its body only works inside a live DDL event-trigger
--    context (pg_event_trigger_ddl_commands() is empty otherwise), so a
--    direct RPC call is a harmless no-op today -- this closes the
--    unnecessary public entry point as defense in depth, without touching
--    (and losing) the beneficial safety-net behavior itself.
-- ============================================================
revoke execute on function rls_auto_enable() from public, anon, authenticated;
