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
  system_narrative_phone text,
  current_status   text default 'In training',
  -- Follow-up status fields (mirror the agency site so imported candidates
  -- can be tracked live).
  availability_status text,
  medical_status   text,
  medical_date     date,
  coc_status       text,
  musaned_status   text,
  tasheer          text,
  tasheer_date     date,
  tasheer_informed boolean default false,
  visa_status      text,
  video_link       text,
  cv_sent_to       text,
  selected_by      text,
  ticket           text,
  ticket_date      date,
  ticket_informed  boolean default false,
  lmis             text,
  wokala           text,
  traveled         boolean default false,
  payment          text,
  amount           numeric,
  passport_scan_url text,
  agency_passport_scan_url text
);

-- 1b. Add the follow-up columns to an EXISTING table (safe to re-run) --------
alter table public.candidates
  add column if not exists system_narrative_phone text,
  add column if not exists availability_status text,
  add column if not exists medical_status text,
  add column if not exists medical_date   date,
  add column if not exists coc_status     text,
  add column if not exists musaned_status text,
  add column if not exists visa_status    text,
  add column if not exists video_link     text,
  add column if not exists cv_sent_to     text,
  add column if not exists selected_by    text,
  add column if not exists ticket         text,
  add column if not exists ticket_date    date,
  add column if not exists lmis           text,
  add column if not exists wokala         text,
  add column if not exists tasheer_informed boolean default false,
  add column if not exists ticket_informed  boolean default false,
  add column if not exists payment          text,
  add column if not exists amount           numeric,
  add column if not exists passport_scan_url text,
  add column if not exists agency_passport_scan_url text;

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
