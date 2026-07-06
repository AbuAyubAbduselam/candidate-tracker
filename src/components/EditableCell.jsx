import { useEffect, useRef, useState } from 'react'
import { STATUS_STYLES, TASHEER_STYLES } from '../constants'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/* --------------------------------------------------------------------------
 * Inline text / number / date editor — click the value to edit it.
 * ------------------------------------------------------------------------ */
function InlineText({ value, type = 'text', placeholder = '—', onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef(null)

  useEffect(() => setDraft(value ?? ''), [value])
  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = () => {
    setEditing(false)
    const next = draft === '' ? null : draft
    if ((next ?? '') !== (value ?? '')) onSave(next)
  }
  const cancel = () => {
    setDraft(value ?? '')
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft ?? ''}
        inputMode={type === 'number' ? 'decimal' : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') cancel()
        }}
        className="w-full min-w-[7rem] rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm outline-none ring-2 ring-indigo-100"
      />
    )
  }

  const display = type === 'date' ? formatDate(value) : value

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to edit"
      className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-800 transition hover:bg-indigo-50/70 focus:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
    >
      <span className={display ? '' : 'text-slate-400'}>{display || placeholder}</span>
    </button>
  )
}

/* --------------------------------------------------------------------------
 * Coloured dropdown badge — used for Current Status & Tasheer.
 * ------------------------------------------------------------------------ */
function StatusSelect({ value, options, styles, placeholder, onSave }) {
  const cls = styles[value] || 'bg-slate-100 text-slate-500 ring-slate-200'
  return (
    <div className="relative inline-flex">
      <select
        value={value ?? ''}
        onChange={(e) => onSave(e.target.value || null)}
        className={`w-full max-w-[10rem] cursor-pointer appearance-none truncate rounded-full py-1.5 pl-3 pr-7 text-xs font-semibold ring-1 ring-inset outline-none transition focus:ring-2 ${cls}`}
      >
        <option value="">{placeholder}…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  )
}

/* --------------------------------------------------------------------------
 * Yes / No toggle — used for Traveled.
 * ------------------------------------------------------------------------ */
function BooleanToggle({ value, onSave }) {
  const yes = value === true
  return (
    <button
      type="button"
      onClick={() => onSave(!yes)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
        yes
          ? 'bg-emerald-100 text-emerald-800 ring-emerald-200 hover:bg-emerald-200'
          : 'bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${yes ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {yes ? 'Yes' : 'No'}
    </button>
  )
}

/* --------------------------------------------------------------------------
 * Passport scan cell — view existing file or upload / replace one.
 * ------------------------------------------------------------------------ */
function FileCell({ value, onUpload }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const handle = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      await onUpload(file)
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {value && (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          View
        </a>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handle}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60"
      >
        {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
      </button>
    </div>
  )
}

/* --------------------------------------------------------------------------
 * Dispatcher: pick the right editor for a column.
 * ------------------------------------------------------------------------ */
export default function CellEditor({ column, candidate, onSaveField, onUploadScan }) {
  const value = candidate[column.key]

  switch (column.type) {
    case 'select':
      return (
        <StatusSelect
          value={value}
          options={column.options}
          styles={column.key === 'current_status' ? STATUS_STYLES : TASHEER_STYLES}
          placeholder={column.label}
          onSave={(v) => onSaveField(candidate.id, column.key, v)}
        />
      )
    case 'boolean':
      return <BooleanToggle value={value} onSave={(v) => onSaveField(candidate.id, column.key, v)} />
    case 'date':
      return (
        <InlineText value={value} type="date" onSave={(v) => onSaveField(candidate.id, column.key, v)} />
      )
    case 'file':
      return <FileCell value={value} onUpload={(file) => onUploadScan(candidate.id, file)} />
    default:
      return (
        <InlineText
          value={value}
          type={column.type}
          onSave={(v) => onSaveField(candidate.id, column.key, v)}
        />
      )
  }
}
