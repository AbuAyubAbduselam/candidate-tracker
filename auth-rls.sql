-- ============================================================================
--  Candidate Tracker — lock data to logged-in users
--
--  Run this ONCE in the TRACKER Supabase project after enabling login:
--    Tracker Supabase Dashboard → SQL Editor → New query → paste → Run
--
--  Why: once the app requires a Supabase login, requests run as the
--  `authenticated` role instead of `anon`. The original policies only granted
--  `anon`, so without this the app would read/write nothing after signing in.
--  This replaces the open anon access with authenticated-only access.
-- ============================================================================

-- Candidates: only logged-in users can read/write ---------------------------
drop policy if exists "candidates anon read"   on public.candidates;
drop policy if exists "candidates anon write"  on public.candidates;
drop policy if exists "candidates auth read"   on public.candidates;
drop policy if exists "candidates auth write"  on public.candidates;

create policy "candidates auth read"
  on public.candidates for select
  to authenticated using (true);

create policy "candidates auth write"
  on public.candidates for all
  to authenticated using (true) with check (true);

-- Passport scans storage: logged-in users only ------------------------------
drop policy if exists "passport public read"  on storage.objects;
drop policy if exists "passport anon upload"  on storage.objects;
drop policy if exists "passport auth read"    on storage.objects;
drop policy if exists "passport auth upload"  on storage.objects;

create policy "passport auth read"
  on storage.objects for select
  to authenticated using (bucket_id = 'passport-scans');

create policy "passport auth upload"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'passport-scans');

-- Done. The app now works only for signed-in users.
