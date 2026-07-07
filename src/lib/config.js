// Runtime configuration.
//
// Values are loaded from /config.json at startup (see loadConfig, called in
// main.jsx before the app renders). This lets you change the agency connection
// on the deployed site WITHOUT rebuilding — just edit public/config.json.
//
// Build-time env vars (VITE_AGENCY_*) are used as a fallback when config.json
// is missing (e.g. local dev without the file).

let config = {
  agencySupabaseUrl: import.meta.env.VITE_AGENCY_SUPABASE_URL || '',
  agencySupabaseAnonKey: import.meta.env.VITE_AGENCY_SUPABASE_ANON_KEY || '',
}

export async function loadConfig() {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      config = {
        agencySupabaseUrl: json.agencySupabaseUrl || config.agencySupabaseUrl,
        agencySupabaseAnonKey: json.agencySupabaseAnonKey || config.agencySupabaseAnonKey,
      }
    }
  } catch {
    /* No config.json (or invalid) — fall back to build-time env values. */
  }
  return config
}

export const getConfig = () => config
