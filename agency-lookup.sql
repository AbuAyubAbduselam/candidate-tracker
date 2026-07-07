-- ============================================================================
--  Candidate Tracker ← Agency site  (cross-project passport lookup)
--
--  Run this ONCE in the AGENCY Supabase project:
--    Agency Supabase Dashboard → SQL Editor → New query → paste → Run
--
--  It lets the Candidate Tracker app look up a candidate by passport (or
--  labour ID) using the agency project's PUBLIC (anon / publishable) key,
--  WITHOUT opening up the candidates table itself.
--
--  Security notes:
--   • SECURITY DEFINER: the function runs with the owner's rights, so it can
--     read `candidates` even though that table stays locked to the anon role.
--   • It returns ONLY 6 non-financial fields, and ONLY for an EXACT passport
--     or labour-ID match — no listing, no search, no other columns.
--   • To remove access later:  drop function public.tracker_lookup_candidate(text);
-- ============================================================================

-- Drop first: the RETURN signature changed (added follow-up columns), which
-- "create or replace" alone cannot do.
drop function if exists public.tracker_lookup_candidate(text);

create function public.tracker_lookup_candidate(p_query text)
returns table (
  name              text,
  passport_number   text,
  labour_id         text,
  narrative         text,
  narrative_phone   text,
  system_narrative_phone text,
  availability_status text,
  medical_status    text,
  medical_date      date,
  coc_status        text,
  musaned_status    text,
  tasheer           text,
  tasheer_date      date,
  visa_status       text,
  video_link        text,
  cv_sent_to        text,
  selected_by       text,
  selected_at       timestamptz,
  ticket            text,
  ticket_date       date,
  lmis              text,
  wokala            text,
  agency_avatar_url text,
  agency_photo_url  text,
  agency_passport_scan_url text
)
language sql
security definer
set search_path = public
as $$
  select
    nullif(btrim(concat_ws(' ', c.first_name, c.last_name)), '')      as name,
    c.passport_no                                                     as passport_number,
    c.labour_id                                                       as labour_id,
    c.narrative                                                       as narrative,
    c.narrative_phone_no                                              as narrative_phone,
    c.narrative_phone_no                                              as system_narrative_phone,
    c.availability_status                                             as availability_status,
    c.medical_status                                                  as medical_status,
    c.medical_date                                                    as medical_date,
    c.coc_status                                                      as coc_status,
    c.musaned_status                                                  as musaned_status,
    c.tasheer                                                         as tasheer,
    c.tasheer_date                                                    as tasheer_date,
    c.visa_status                                                     as visa_status,
    c.video_link                                                      as video_link,
    c.cv_sent_to                                                      as cv_sent_to,
    c.selected_by                                                     as selected_by,
    c.selected_at                                                     as selected_at,
    c.ticket                                                          as ticket,
    c.ticket_date                                                     as ticket_date,
    c.lmis                                                            as lmis,
    c.wokala                                                          as wokala,
    case when c.avatar ~ '^https?://'
          and c.avatar <> 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
         then c.avatar end                                            as agency_avatar_url,
    case when c.full_size_photo ~ '^https?://' then c.full_size_photo end as agency_photo_url,
    case when c.passport_scan ~ '^https?://' then c.passport_scan end as agency_passport_scan_url
  from public.candidates c
  where lower(btrim(c.passport_no)) = lower(btrim(p_query))
     or lower(btrim(c.labour_id))   = lower(btrim(p_query))
  order by c.created_at desc nulls last
  limit 1;
$$;

-- Only the exact function above is exposed to the public key — nothing else.
revoke all   on function public.tracker_lookup_candidate(text) from public;
grant execute on function public.tracker_lookup_candidate(text) to anon, authenticated;


-- ============================================================================
--  Bulk lookup by NARRATIVE PHONE (last-8-digit match)
--  Returns EVERY candidate whose narrative phone matches the entered number
--  on its last 8 digits, EXCLUDING candidates already arrived in KSA
--  (visa_status = 'Arrived ksa'). Used by the "Import by phone" feature.
-- ============================================================================
drop function if exists public.tracker_lookup_by_phone(text);

create function public.tracker_lookup_by_phone(p_phone text)
returns table (
  name              text,
  passport_number   text,
  labour_id         text,
  narrative         text,
  narrative_phone   text,
  system_narrative_phone text,
  availability_status text,
  medical_status    text,
  medical_date      date,
  coc_status        text,
  musaned_status    text,
  tasheer           text,
  tasheer_date      date,
  visa_status       text,
  video_link        text,
  cv_sent_to        text,
  selected_by       text,
  selected_at       timestamptz,
  ticket            text,
  ticket_date       date,
  lmis              text,
  wokala            text,
  agency_avatar_url text,
  agency_photo_url  text,
  agency_passport_scan_url text
)
language sql
security definer
set search_path = public
as $$
  -- last 8 digits of the entered number (non-digits stripped)
  with q as (
    select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8) as last8
  )
  select
    nullif(btrim(concat_ws(' ', c.first_name, c.last_name)), '')      as name,
    c.passport_no                                                     as passport_number,
    c.labour_id                                                       as labour_id,
    c.narrative                                                       as narrative,
    c.narrative_phone_no                                              as narrative_phone,
    c.narrative_phone_no                                              as system_narrative_phone,
    c.availability_status                                             as availability_status,
    c.medical_status                                                  as medical_status,
    c.medical_date                                                    as medical_date,
    c.coc_status                                                      as coc_status,
    c.musaned_status                                                  as musaned_status,
    c.tasheer                                                         as tasheer,
    c.tasheer_date                                                    as tasheer_date,
    c.visa_status                                                     as visa_status,
    c.video_link                                                      as video_link,
    c.cv_sent_to                                                      as cv_sent_to,
    c.selected_by                                                     as selected_by,
    c.selected_at                                                     as selected_at,
    c.ticket                                                          as ticket,
    c.ticket_date                                                     as ticket_date,
    c.lmis                                                            as lmis,
    c.wokala                                                          as wokala,
    case when c.avatar ~ '^https?://'
          and c.avatar <> 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
         then c.avatar end                                            as agency_avatar_url,
    case when c.full_size_photo ~ '^https?://' then c.full_size_photo end as agency_photo_url,
    case when c.passport_scan ~ '^https?://' then c.passport_scan end as agency_passport_scan_url
  from public.candidates c, q
  where q.last8 <> ''
    and right(regexp_replace(coalesce(c.narrative_phone_no, ''), '\D', '', 'g'), 8) = q.last8
    and lower(coalesce(c.visa_status, '')) <> 'arrived ksa'
  order by c.created_at desc nulls last;
$$;

revoke all   on function public.tracker_lookup_by_phone(text) from public;
grant execute on function public.tracker_lookup_by_phone(text) to anon, authenticated;


