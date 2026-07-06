import { useEffect, useRef, useState } from 'react'

const EMPTY = {
  name: '',
  passport_number: '',
  narrative: '',
  narrative_phone: '',
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
  const fileRef = useRef(null)

  // Reset each time the modal opens.
  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setFile(null)
      setError('')
    }
  }, [open])

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

          <Field label="Passport Number">
            <input
              value={form.passport_number}
              onChange={(e) => update({ passport_number: e.target.value })}
              placeholder="e.g. EP1234567"
              className={fieldCls}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Narrative">
              <input
                value={form.narrative}
                onChange={(e) => update({ narrative: e.target.value })}
                placeholder="Narrative / agent"
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
