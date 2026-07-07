import { useEffect, useMemo, useState } from 'react'

const onlyDigits = (s) => String(s || '').replace(/\D/g, '')
const last8 = (s) => onlyDigits(s).slice(-8)

const fieldCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

/**
 * Import every agency candidate whose narrative phone matches the entered
 * number on its last 8 digits (arrived candidates are excluded server-side).
 */
export default function PhoneImportModal({ open, onClose, onSearch, onImport, existingPassports }) {
  const [phone, setPhone] = useState('')
  const [phase, setPhase] = useState('idle') // idle | searching | results | importing
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (open) {
      setPhone('')
      setPhase('idle')
      setResults([])
      setError('')
      setSummary(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && phase !== 'importing' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, phase, onClose])

  const isDuplicate = (c) => {
    const key = (c.passport_number || '').trim().toLowerCase()
    return key && existingPassports.has(key)
  }

  const newOnes = useMemo(() => results.filter((c) => !isDuplicate(c)), [results]) // eslint-disable-line react-hooks/exhaustive-deps
  const dupCount = results.length - newOnes.length

  if (!open) return null

  const search = async () => {
    if (!phone.trim() || phase === 'searching') return
    setPhase('searching')
    setError('')
    setSummary(null)
    const { data, error: err } = await onSearch(phone)
    if (err) {
      setError(err === 'not-configured' ? 'Agency lookup is not configured.' : err)
      setPhase('idle')
      return
    }
    setResults(data)
    setPhase('results')
  }

  const runImport = async () => {
    if (newOnes.length === 0) return
    setPhase('importing')
    setError('')
    const res = await onImport(newOnes)
    if (res.error) {
      setError(res.error)
      setPhase('results')
      return
    }
    setSummary(res)
    setPhase('results')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm animate-fade sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && phase !== 'importing' && onClose()}
    >
      <div className="animate-pop flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Import by phone</h2>
            <p className="text-xs text-slate-500">
              Imports every agency candidate with this narrative phone (arrived candidates excluded).
            </p>
          </div>
          <button
            type="button"
            onClick={() => phase !== 'importing' && onClose()}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Phone input */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Narrative phone number
            </span>
            <div className="flex gap-2">
              <input
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="e.g. 0912 345 678"
                className={fieldCls}
              />
              <button
                type="button"
                onClick={search}
                disabled={!phone.trim() || phase === 'searching'}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {phase === 'searching' ? 'Searching…' : 'Search'}
              </button>
            </div>
            {last8(phone).length > 0 && (
              <p className="mt-1.5 text-[11px] text-slate-400">
                Matching on last 8 digits: <span className="font-mono font-semibold">{last8(phone)}</span>
              </p>
            )}
          </label>

          {error && (
            <div className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
              {error}
            </div>
          )}

          {/* Results */}
          {phase !== 'idle' && phase !== 'searching' && !error && (
            <div className="mt-4">
              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No matching candidates in the agency (or all matches have already arrived).
                </div>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">
                      {results.length} match{results.length === 1 ? '' : 'es'}
                    </span>
                    <span className="text-slate-400">
                      {newOnes.length} new{dupCount > 0 ? ` · ${dupCount} already in tracker` : ''}
                    </span>
                  </div>
                  <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-2">
                    {results.map((c, i) => {
                      const dup = isDuplicate(c)
                      return (
                        <li
                          key={`${c.passport_number || 'x'}-${i}`}
                          className={`flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ${
                            dup ? 'opacity-60 ring-slate-100' : 'ring-slate-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-800">{c.name || 'Unnamed'}</div>
                            <div className="truncate text-[11px] text-slate-400">
                              {c.passport_number || '—'} · {c.visa_status || 'no visa status'}
                            </div>
                          </div>
                          {dup && (
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              In tracker
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}

              {summary && (
                <div className="mt-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100">
                  ✓ Imported {summary.imported} candidate{summary.imported === 1 ? '' : 's'}
                  {summary.skipped > 0 ? ` · skipped ${summary.skipped} already in tracker` : ''}.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={() => phase !== 'importing' && onClose()}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {summary ? 'Done' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={runImport}
            disabled={phase !== 'results' || newOnes.length === 0 || !!summary}
            className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60"
          >
            {phase === 'importing' && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {phase === 'importing'
              ? 'Importing…'
              : newOnes.length > 0
                ? `Import ${newOnes.length}`
                : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
