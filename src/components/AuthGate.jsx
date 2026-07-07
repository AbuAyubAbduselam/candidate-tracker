import { useAuth } from '../lib/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import Login from './Login'

/**
 * Requires a logged-in Supabase user before rendering the app.
 * When Supabase isn't configured yet there's nothing to protect, so the app
 * (with its setup banner) is shown as-is.
 */
export default function AuthGate({ children }) {
  const { session, loading } = useAuth()

  if (!isSupabaseConfigured) return children

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-slate-500">
        <svg className="mr-2 h-5 w-5 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Loading…
      </div>
    )
  }

  if (!session) return <Login />

  return children
}
