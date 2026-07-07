import { createClient } from '@supabase/supabase-js'

// Second Supabase client, pointed at the AGENCY project. Read-only: it can only
// call the `tracker_lookup_candidate` RPC (see agency-lookup.sql). Configured
// via separate env vars so the tracker's own project stays independent.
const url = import.meta.env.VITE_AGENCY_SUPABASE_URL
const key = import.meta.env.VITE_AGENCY_SUPABASE_ANON_KEY

export const isAgencyConfigured = Boolean(
  url && key && !url.includes('YOUR_') && !key.includes('YOUR_'),
)

const agencySupabase = isAgencyConfigured ? createClient(url, key) : null

/**
 * Look up a candidate in the agency database by passport number (or labour ID).
 * Returns { data, error } where data is the candidate or null when not found.
 * data shape: { name, passport_number, labour_id, narrative, narrative_phone,
 *               passport_scan_url }
 */
export async function lookupAgencyCandidate(query) {
  if (!agencySupabase) return { data: null, error: 'not-configured' }
  const value = String(query || '').trim()
  if (!value) return { data: null, error: null }

  const { data, error } = await agencySupabase.rpc('tracker_lookup_candidate', {
    p_query: value,
  })
  if (error) return { data: null, error: error.message }
  return { data: (Array.isArray(data) ? data[0] : data) || null, error: null }
}

/**
 * Look up ALL agency candidates whose narrative phone matches `phone` on its
 * last 8 digits, excluding candidates already arrived in KSA. Returns
 * { data: [...candidates], error }.
 */
export async function lookupAgencyByPhone(phone) {
  if (!agencySupabase) return { data: [], error: 'not-configured' }
  const value = String(phone || '').trim()
  if (!value) return { data: [], error: null }

  const { data, error } = await agencySupabase.rpc('tracker_lookup_by_phone', {
    p_phone: value,
  })
  if (error) return { data: [], error: error.message }
  return { data: data || [], error: null }
}
