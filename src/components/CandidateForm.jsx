import { useEffect, useRef, useState } from 'react'
import { isAgencyConfigured, lookupAgencyCandidate } from '../lib/agencySupabase'

const EMPTY = {
  name: '',
  passport_number: '',
  labour_id: '',
  narrative: '',
  narrative_phone: '',
  // Follow-up fields — filled by the agency import (dates default to null so
  // empty values aren't sent to date columns).
  system_narrative_phone: '',
  availability_status: '',
  medical_status: '',
  medical_date: null,
  coc_status: '',
  musaned_status: '',
  tasheer: '',
  tasheer_date: null,
  visa_status: '',
  video_link: '',
  cv_sent_to: '',
  selected_by: '',
  ticket: '',
  ticket_date: null,
  lmis: '',
  wokala: '',
  // Manual upload (set via the file input); agency scan is stored separately.
  passport_scan_url: '',
  agency_passport_scan_url: '',
}

const fieldCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  )
}

export default function CandidateForm({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Agency passport lookup: { status: 'idle'|'searching'|'found'|'notfound'|'error'|'imported', candidate?, message? }
  const [agency, setAgency] = useState({ status: 'idle' })
  const fileRef = useRef(null)

  // Reset each time the modal opens.
  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setFile(null)
      setError('')
      setAgency({ status: 'idle' })
    }
  }, [open])

  // Debounced agency lookup as the user types a passport number / labour ID.
  useEffect(() => {
    if (!open || !isAgencyConfigured()) return
    const value = form.passport_number.trim()
    if (value.length < 4) {
      setAgency((a) => (a.status === 'idle' ? a : { status: 'idle' }))
      return
    }
    let cancelled = false
    setAgency({ status: 'searching' })
    const t = setTimeout(async () => {
      const { data, error: err } = await lookupAgencyCandidate(value)
      if (cancelled) return
      if (err) setAgency({ status: 'error', message: err })
      else if (data) setAgency({ status: 'found', candidate: data })
      else setAgency({ status: 'notfound' })
    }, 450)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [open, form.passport_number])

  // One-click import: merge the agency record into the form.
  const importAgency = (c) => {
    setForm((f) => ({
      ...f,
      name: c.name || f.name,
      passport_number: c.passport_number || f.passport_number,
      labour_id: c.labour_id || f.labour_id,
      // Narrative name / phone are manual-only — never filled from the agency.
      // System Narrative Phone mirrors the agency's narrative phone (read-only).
      system_narrative_phone: c.system_narrative_phone || f.system_narrative_phone,
      availability_status: c.availability_status || f.availability_status,
      medical_status: c.medical_status || f.medical_status,
      medical_date: c.medical_date || f.medical_date,
      coc_status: c.coc_status || f.coc_status,
      musaned_status: c.musaned_status || f.musaned_status,
      tasheer: c.tasheer || f.tasheer,
      tasheer_date: c.tasheer_date || f.tasheer_date,
      visa_status: c.visa_status || f.visa_status,
      video_link: c.video_link || f.video_link,
      cv_sent_to: c.cv_sent_to || f.cv_sent_to,
      selected_by: c.selected_by || f.selected_by,
      ticket: c.ticket || f.ticket,
      ticket_date: c.ticket_date || f.ticket_date,
      lmis: c.lmis || f.lmis,
      wokala: c.wokala || f.wokala,
      agency_passport_scan_url: c.agency_passport_scan_url || f.agency_passport_scan_url,
    }))
    setAgency({ status: 'imported', candidate: c })
  }

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, saving, onClose])

  if (!open) return null

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit(form, file)
      onClose()
    } catch (err) {
      setError(err?.message || 'Could not save candidate.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm animate-fade sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="animate-pop max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-3xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Register candidate</h2>
            <p className="text-xs text-slate-500">Add a new candidate to the tracker</p>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          <Field label="Name" required>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Full name"
              className={fieldCls}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Passport Number">
              <input
                value={form.passport_number}
                onChange={(e) => update({ passport_number: e.target.value })}
                placeholder="e.g. EP1234567"
                className={fieldCls}
              />
            </Field>
            <Field label="Labour ID">
              <input
                value={form.labour_id}
                onChange={(e) => update({ labour_id: e.target.value })}
                placeholder="ID number"
                className={fieldCls}
              />
            </Field>
          </div>

          {/* Agency database lookup — appears as the passport number is typed */}
          {isAgencyConfigured() && agency.status !== 'idle' && (
            <div className="-mt-1">
              {agency.status === 'searching' && (
                <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <svg className="h-3.5 w-3.5 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Searching agency database…
                </p>
              )}

              {agency.status === 'found' && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      Found in agency database
                    </p>
                    <p className="truncate text-sm font-bold text-emerald-900">
                      {agency.candidate.name || 'Unnamed candidate'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => importAgency(agency.candidate)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 3v10m0 0-3.5-3.5M10 13l3.5-3.5M4 16h12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Import
                  </button>
                </div>
              )}

              {agency.status === 'imported' && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 10.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0z" clipRule="evenodd" />
                  </svg>
                  Imported from agency — review below and click Add candidate.
                </p>
              )}

              {agency.status === 'notfound' && (
                <p className="text-xs font-medium text-slate-400">
                  No match in the agency database — fill the form manually or paste data above.
                </p>
              )}

              {agency.status === 'error' && agency.message !== 'not-configured' && (
                <p className="text-xs font-medium text-amber-700">
                  Agency lookup unavailable: {agency.message}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Narrative Name">
              <input
                value={form.narrative}
                onChange={(e) => update({ narrative: e.target.value })}
                placeholder="Narrative name"
                className={fieldCls}
              />
            </Field>
            <Field label="Narrative Phone">
              <input
                type="tel"
                value={form.narrative_phone}
                onChange={(e) => update({ narrative_phone: e.target.value })}
                placeholder="+251 …"
                className={fieldCls}
              />
            </Field>
          </div>

          <Field label="Passport Scan (optional)">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700"
            />
            {file && (
              <p className="mt-1.5 text-xs text-slate-500">
                Selected: <span className="font-medium text-slate-700">{file.name}</span>
              </p>
            )}
          </Field>

          {error && (
            <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
              {error}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => !saving && onClose()}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-70"
            >
              {saving && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {saving ? 'Saving…' : 'Add candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
