-- ContractIQ database schema -- paste-and-run in the Supabase SQL Editor on
-- a fresh project. Covers extensions, enums, every table in dependency
-- order, FKs, indexes, updated_at triggers, RLS, and the Storage bucket.
-- Source: docs/engineering/engineering-doc.md §7,
--         docs/engineering/implementation-specs.md §12,
--         contractiq/specs/supabase-schema.sql (identical content).

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

-- ============================================================
-- Not created here, reserved for Stage 7 (security-foundation):
--   rate_limit_events
-- ============================================================
