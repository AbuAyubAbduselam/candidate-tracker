-- ============================================================================
--  Candidate Tracker — Supabase setup
--  Run this whole file in:  Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- 1. Table -------------------------------------------------------------------
create extension if not exists "pgcrypto";

create table if not exists public.candidates (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  name             text not null,
  passport_number  text,
  labour_id        text,
  narrative        text,
  narrative_phone  text,
  current_status   text default 'In training',
  tasheer          text,
  tasheer_date     date,
  ticket           text,
  ticket_date      date,
  traveled         boolean default false,
  payment          text,
  passport_scan_url text
);

-- 2. Row Level Security ------------------------------------------------------
-- The frontend uses the public "anon" key, so we open access for the anon role.
-- ⚠  This is fine for an internal/demo tool. For production add Supabase Auth
--    and replace `true` with proper user checks.
alter table public.candidates enable row level security;

drop policy if exists "candidates anon read"   on public.candidates;
drop policy if exists "candidates anon write"  on public.candidates;

create policy "candidates anon read"
  on public.candidates for select
  to anon using (true);

create policy "candidates anon write"
  on public.candidates for all
  to anon using (true) with check (true);

-- 3. Storage bucket for passport scans ---------------------------------------
insert into storage.buckets (id, name, public)
values ('passport-scans', 'passport-scans', true)
on conflict (id) do nothing;

drop policy if exists "passport public read"  on storage.objects;
drop policy if exists "passport anon upload"  on storage.objects;

create policy "passport public read"
  on storage.objects for select
  to anon using (bucket_id = 'passport-scans');

create policy "passport anon upload"
  on storage.objects for insert
  to anon with check (bucket_id = 'passport-scans');

-- Done. Your app can now read/write candidates and upload passport scans.
