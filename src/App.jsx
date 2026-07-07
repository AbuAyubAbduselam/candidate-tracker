import { useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured, PASSPORT_BUCKET } from './lib/supabase'
import { isAgencyConfigured, lookupAgencyCandidate, lookupAgencyByPhone } from './lib/agencySupabase'
import { useAuth } from './lib/AuthContext'
import { COLUMNS } from './constants'

// Fields refreshed from the agency on sync. Passport number (the match key) is
// intentionally left out so the row stays anchored.
// Narrative name / phone are intentionally excluded — they're manual-only
// tracker fields and must never be overwritten from the agency.
const SYNC_FIELDS = [
  'name',
  'labour_id',
  'system_narrative_phone',
  'availability_status',
  'medical_status',
  'medical_date',
  'coc_status',
  'musaned_status',
  'tasheer',
  'tasheer_date',
  'visa_status',
  'video_link',
  'cv_sent_to',
  'selected_by',
  'ticket',
  'ticket_date',
  'lmis',
  'wokala',
  'agency_passport_scan_url',
]

// Agency fields written into the tracker on import (same set as sync, plus the
// identifying columns). Narrative name / phone stay manual-only.
const IMPORT_FIELDS = [
  'name',
  'passport_number',
  'labour_id',
  'system_narrative_phone',
  'availability_status',
  'medical_status',
  'medical_date',
  'coc_status',
  'musaned_status',
  'tasheer',
  'tasheer_date',
  'visa_status',
  'video_link',
  'cv_sent_to',
  'selected_by',
  'ticket',
  'ticket_date',
  'lmis',
  'wokala',
  'agency_passport_scan_url',
]

// Build a tracker insert row from an agency candidate record.
function buildImportRow(c) {
  const row = { current_status: 'In training', traveled: false }
  for (const f of IMPORT_FIELDS) {
    const v = c[f]
    row[f] = v === '' || v === undefined ? null : v
  }
  if (!row.name) row.name = 'Unnamed'
  return row
}

import Filters from './components/Filters'
import CandidateForm from './components/CandidateForm'
import CandidateTable from './components/CandidateTable'
import PhoneImportModal from './components/PhoneImportModal'

const sanitize = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_')

/* -------------------------------------------------------------------------- */
/* Toasts                                                                     */
/* -------------------------------------------------------------------------- */
function Toasts({ toasts, dismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-pop pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
            t.type === 'error'
              ? 'bg-rose-600 text-white ring-rose-700/20'
              : 'bg-slate-900 text-white ring-black/20'
          }`}
          onClick={() => dismiss(t.id)}
        >
          <span className="flex-1">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Stat chip                                                                  */
/* -------------------------------------------------------------------------- */
function Stat({ label, value, tone }) {
  const tones = {
    indigo: 'from-indigo-500 to-violet-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
  }
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/60 bg-white/70 px-3.5 py-2 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <span className={`h-8 w-1.5 rounded-full bg-gradient-to-b ${tones[tone]}`} />
      <div>
        <div className="text-lg font-extrabold leading-none text-slate-800">{value}</div>
        <div className="text-[11px] font-medium text-slate-500">{label}</div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Setup banner (shown when Supabase keys are missing)                        */
/* -------------------------------------------------------------------------- */
function SetupBanner() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm ring-1 ring-amber-100 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-amber-900">Connect Supabase to start</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-amber-800">
            <li>Create a project at <span className="font-semibold">supabase.com</span>.</li>
            <li>Open <span className="font-mono text-xs">supabase-schema.sql</span> and run it in the SQL Editor.</li>
            <li>
              Paste your <span className="font-semibold">Project URL</span> &amp;{' '}
              <span className="font-semibold">anon key</span> into{' '}
              <span className="font-mono text-xs">.env.local</span>.
            </li>
            <li>Restart <span className="font-mono text-xs">npm run dev</span>.</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* App                                                                        */
/* -------------------------------------------------------------------------- */
export default function App() {
  const { user, signOut } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [phoneModalOpen, setPhoneModalOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [filters, setFilters] = useState({
    search: '',
    tasheer: '',
    ticket: '',
    musaned_status: '',
    coc_status: '',
    medical_status: '',
    video: '',
  })
  const [bulkSync, setBulkSync] = useState({ running: false, done: 0, total: 0 })

  /* ---- toast helpers ---- */
  const pushToast = (type, message) => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, type, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id))

  /* ---- initial load ---- */
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    ;(async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) setLoadError(error.message)
      else setCandidates(data || [])
      setLoading(false)
    })()
  }, [])

  /* ---- mutations ---- */
  async function saveField(id, field, value) {
    const snapshot = candidates
    setCandidates((cs) => cs.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
    const { error } = await supabase.from('candidates').update({ [field]: value }).eq('id', id)
    if (error) {
      setCandidates(snapshot)
      pushToast('error', `Save failed: ${error.message}`)
    }
  }

  async function uploadScan(id, file) {
    const path = `${id}/${Date.now()}-${sanitize(file.name)}`
    const { error: upErr } = await supabase.storage
      .from(PASSPORT_BUCKET)
      .upload(path, file, { upsert: true })
    if (upErr) {
      pushToast('error', `Upload failed: ${upErr.message}`)
      return
    }
    const url = supabase.storage.from(PASSPORT_BUCKET).getPublicUrl(path).data.publicUrl
    await saveField(id, 'passport_scan_url', url)
    pushToast('success', 'Passport scan uploaded')
  }

  async function addCandidate(form, file) {
    if (!isSupabaseConfigured) throw new Error('Connect Supabase first (see the banner above).')

    // Empty strings must become null — otherwise date columns (medical_date,
    // tasheer_date) reject '' with an invalid-input error.
    const cleaned = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]),
    )

    const { data, error } = await supabase
      .from('candidates')
      .insert({ ...cleaned, current_status: 'In training', traveled: false })
      .select()
      .single()
    if (error) throw error

    if (file) {
      const path = `${data.id}/${Date.now()}-${sanitize(file.name)}`
      const { error: upErr } = await supabase.storage.from(PASSPORT_BUCKET).upload(path, file)
      if (!upErr) {
        const url = supabase.storage.from(PASSPORT_BUCKET).getPublicUrl(path).data.publicUrl
        await supabase.from('candidates').update({ passport_scan_url: url }).eq('id', data.id)
        data.passport_scan_url = url
      }
    }

    setCandidates((cs) => [data, ...cs])
    pushToast('success', 'Candidate added')
  }

  /* ---- import by narrative phone (bulk) ---- */
  // Passport numbers already in the tracker (to skip duplicates on import).
  const existingPassports = useMemo(
    () =>
      new Set(
        candidates.map((c) => (c.passport_number || '').trim().toLowerCase()).filter(Boolean),
      ),
    [candidates],
  )

  async function searchByPhone(phone) {
    return lookupAgencyByPhone(phone)
  }

  // Insert the given agency candidates, skipping any whose passport already
  // exists in the tracker. Returns { imported, skipped, error }.
  async function importCandidates(list) {
    const seen = new Set()
    const rows = []
    let skipped = 0
    for (const c of list) {
      const key = (c.passport_number || '').trim().toLowerCase()
      if (key && (existingPassports.has(key) || seen.has(key))) {
        skipped += 1
        continue
      }
      if (key) seen.add(key)
      rows.push(buildImportRow(c))
    }
    if (rows.length === 0) return { imported: 0, skipped }

    const { data, error } = await supabase.from('candidates').insert(rows).select()
    if (error) return { imported: 0, skipped, error: error.message }
    setCandidates((cs) => [...(data || []), ...cs])
    return { imported: data?.length || 0, skipped }
  }

  async function deleteCandidate(id) {
    const snapshot = candidates
    setCandidates((cs) => cs.filter((c) => c.id !== id))
    const { error } = await supabase.from('candidates').delete().eq('id', id)
    if (error) {
      setCandidates(snapshot)
      pushToast('error', `Delete failed: ${error.message}`)
    } else {
      pushToast('success', 'Candidate deleted')
    }
  }

  /* ---- agency sync ---- */
  // Refresh one candidate from the agency database. Only overwrites fields the
  // agency has a value for (never clears your local data from an agency blank).
  // Returns: 'updated' | 'unchanged' | 'notfound' | 'nokey' | 'error'
  async function syncOne(candidate) {
    const key = (candidate.passport_number || candidate.labour_id || '').trim()
    if (!key) return 'nokey'
    const { data, error } = await lookupAgencyCandidate(key)
    if (error) return 'error'
    if (!data) return 'notfound'

    const patch = {}
    for (const f of SYNC_FIELDS) {
      const next = data[f]
      if (next == null || next === '') continue
      if ((candidate[f] ?? null) !== next) patch[f] = next
    }
    if (Object.keys(patch).length === 0) return 'unchanged'

    const { error: upErr } = await supabase.from('candidates').update(patch).eq('id', candidate.id)
    if (upErr) return 'error'
    setCandidates((cs) => cs.map((c) => (c.id === candidate.id ? { ...c, ...patch } : c)))
    return 'updated'
  }

  // Per-row sync (called from the table row button).
  async function syncCandidate(candidate) {
    const r = await syncOne(candidate)
    const msg = {
      updated: ['success', `${candidate.name || 'Candidate'} synced from agency`],
      unchanged: ['success', 'Already up to date'],
      notfound: ['error', 'Not found in the agency database'],
      nokey: ['error', 'No passport / labour ID to match against'],
      error: ['error', 'Sync failed'],
    }[r]
    pushToast(...msg)
  }

  // Bulk: sync every candidate that has a passport / labour ID.
  async function syncAll() {
    if (bulkSync.running) return
    const targets = candidates.filter((c) => c.passport_number || c.labour_id)
    if (targets.length === 0) {
      pushToast('error', 'No candidates with a passport / labour ID to sync')
      return
    }
    setBulkSync({ running: true, done: 0, total: targets.length })
    const tally = { updated: 0, unchanged: 0, notfound: 0, nokey: 0, error: 0 }
    const CONCURRENCY = 5
    for (let i = 0; i < targets.length; i += CONCURRENCY) {
      const chunk = targets.slice(i, i + CONCURRENCY)
      const results = await Promise.all(chunk.map((c) => syncOne(c)))
      results.forEach((r) => (tally[r] += 1))
      setBulkSync((b) => ({ ...b, done: Math.min(b.done + chunk.length, b.total) }))
    }
    setBulkSync({ running: false, done: 0, total: 0 })
    const parts = [`${tally.updated} updated`, `${tally.unchanged} unchanged`]
    if (tally.notfound) parts.push(`${tally.notfound} not in agency`)
    if (tally.error) parts.push(`${tally.error} failed`)
    pushToast(tally.error ? 'error' : 'success', `Sync complete — ${parts.join(', ')}`)
  }

  /* ---- filtering ---- */
  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const hay = [c.name, c.passport_number, c.labour_id, c.narrative, c.narrative_phone]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filters.tasheer && c.tasheer !== filters.tasheer) return false
      if (filters.ticket && c.ticket !== filters.ticket) return false
      if (filters.musaned_status && c.musaned_status !== filters.musaned_status) return false
      if (filters.coc_status && c.coc_status !== filters.coc_status) return false
      if (filters.medical_status && c.medical_status !== filters.medical_status) return false
      if (filters.video === 'yes' && !c.video_link) return false
      if (filters.video === 'no' && c.video_link) return false
      return true
    })
  }, [candidates, filters])

  const stats = useMemo(
    () => ({
      total: candidates.length,
      traveled: candidates.filter((c) => c.traveled === true).length,
      selected: candidates.filter((c) => c.current_status === 'Selected').length,
    }),
    [candidates],
  )

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Header */}
        <header className="mb-5 flex flex-col gap-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                  Candidate Tracker
                </h1>
                <p className="hidden text-sm text-slate-500 sm:block">
                  Manage candidates tasheer ,tickets &amp statuses  
                </p>
              </div>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              {isAgencyConfigured && (
                <button
                  type="button"
                  onClick={syncAll}
                  disabled={bulkSync.running}
                  title="Refresh all candidates from the agency database"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-60 sm:flex-none sm:px-3.5"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={bulkSync.running ? 'animate-spin' : ''}
                  >
                    <path d="M16 4v4h-4M4 16v-4h4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15.5 8a6 6 0 0 0-10.9-1.5M4.5 12a6 6 0 0 0 10.9 1.5" strokeLinecap="round" />
                  </svg>
                  <span className="hidden sm:inline">
                    {bulkSync.running ? `Syncing ${bulkSync.done}/${bulkSync.total}…` : 'Sync all'}
                  </span>
                  <span className="sm:hidden">{bulkSync.running ? `${bulkSync.done}/${bulkSync.total}` : 'Sync'}</span>
                </button>
              )}

              {isAgencyConfigured && (
                <button
                  type="button"
                  onClick={() => setPhoneModalOpen(true)}
                  title="Import all agency candidates with a narrative phone number"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 sm:flex-none sm:px-3.5"
                >
                  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <path
                      d="M5 3.5h2l1 3-1.5 1a8 8 0 0 0 4 4l1-1.5 3 1v2A1.5 1.5 0 0 1 14 17.5 12 12 0 0 1 2.5 6 1.5 1.5 0 0 1 4 4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="hidden sm:inline">Import by phone</span>
                  <span className="sm:hidden">Phone</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-violet-700 active:scale-95 sm:flex-none sm:px-4"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M10 4v12M4 10h12" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">Register candidate</span>
                <span className="sm:hidden">Add</span>
              </button>

              <button
                type="button"
                onClick={signOut}
                title={user ? `Sign out (${user.email})` : 'Sign out'}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-rose-600 active:scale-95"
              >
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path
                    d="M13 6.5V5A1.5 1.5 0 0 0 11.5 3.5h-6A1.5 1.5 0 0 0 4 5v10a1.5 1.5 0 0 0 1.5 1.5h6A1.5 1.5 0 0 0 13 15v-1.5M8.5 10H17m0 0-2.5-2.5M17 10l-2.5 2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="hidden lg:inline">Sign out</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2.5">
            <Stat label="Total candidates" value={stats.total} tone="indigo" />
            <Stat label="Selected" value={stats.selected} tone="amber" />
            <Stat label="Traveled" value={stats.traveled} tone="emerald" />
          </div>
        </header>

        {/* Setup banner */}
        {!isSupabaseConfigured && (
          <div className="mb-5">
            <SetupBanner />
          </div>
        )}

        {/* Load error (e.g. table not created yet) */}
        {loadError && (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 ring-1 ring-rose-100">
            <p className="font-semibold">Couldn’t load candidates.</p>
            <p className="mt-1 break-words">{loadError}</p>
            <p className="mt-2 text-rose-700">
              If the table doesn’t exist yet, run{' '}
              <span className="font-mono text-xs">supabase-schema.sql</span> in your Supabase SQL Editor.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="mb-4">
          <Filters filters={filters} setFilters={setFilters} total={candidates.length} shown={filtered.length} />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 py-20 text-slate-500">
            <svg className="mr-2 h-5 w-5 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Loading candidates…
          </div>
        ) : (
          <CandidateTable
            candidates={filtered}
            onSaveField={saveField}
            onUploadScan={uploadScan}
            onDelete={deleteCandidate}
            onSync={syncCandidate}
            agencyEnabled={isAgencyConfigured}
          />
        )}

        {/* Footer hint */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Tip: tap any value in the {COLUMNS.length}-column view to edit it inline · click a column header to sort.
        </p>
      </div>

      <CandidateForm open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={addCandidate} />
      <PhoneImportModal
        open={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        onSearch={searchByPhone}
        onImport={importCandidates}
        existingPassports={existingPassports}
      />
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
