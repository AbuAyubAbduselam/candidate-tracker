import { createClient } from '@supabase/supabase-js'
import { getConfig } from './config'

// The agency client is created lazily from runtime config (loaded from
// /config.json in main.jsx), so it works on the deployed site without a
// rebuild when the agency connection changes.
let client = null
let clientSig = ''

const valid = (url, key) => Boolean(url && key && !url.includes('YOUR_') && !key.includes('YOUR_'))

function getClient() {
  const { agencySupabaseUrl: url, agencySupabaseAnonKey: key } = getConfig()
  if (!valid(url, key)) return null
  const sig = `${url}|${key}`
  if (!client || clientSig !== sig) {
    client = createClient(url, key)
    clientSig = sig
  }
  return client
}

/** True when the agency connection is configured (call at render time). */
export function isAgencyConfigured() {
  const { agencySupabaseUrl: url, agencySupabaseAnonKey: key } = getConfig()
  return valid(url, key)
}

/**
 * Look up a single candidate in the agency database by passport / labour ID.
 * Returns { data, error }.
 */
export async function lookupAgencyCandidate(query) {
  const sb = getClient()
  if (!sb) return { data: null, error: 'not-configured' }
  const value = String(query || '').trim()
  if (!value) return { data: null, error: null }

  const { data, error } = await sb.rpc('tracker_lookup_candidate', { p_query: value })
  if (error) return { data: null, error: error.message }
  return { data: (Array.isArray(data) ? data[0] : data) || null, error: null }
}

/**
 * Look up ALL agency candidates whose narrative phone matches `phone` on its
 * last 8 digits, excluding candidates already arrived in KSA.
 */
export async function lookupAgencyByPhone(phone) {
  const sb = getClient()
  if (!sb) return { data: [], error: 'not-configured' }
  const value = String(phone || '').trim()
  if (!value) return { data: [], error: null }

  const { data, error } = await sb.rpc('tracker_lookup_by_phone', { p_phone: value })
  if (error) return { data: [], error: error.message }
  return { data: data || [], error: null }
}
