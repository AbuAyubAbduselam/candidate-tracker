import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// True only when real credentials have been provided in .env.local
export const isSupabaseConfigured = Boolean(
  url &&
    anonKey &&
    !url.includes('YOUR_') &&
    !anonKey.includes('YOUR_'),
)

// When not configured we export `null` so the UI can show a friendly setup
// banner instead of throwing at import time.
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null

// Name of the Storage bucket that holds passport scans.
export const PASSPORT_BUCKET = 'passport-scans'
