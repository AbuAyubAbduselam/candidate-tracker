import { useEffect, useRef, useState } from 'react'
import { SELECT_STYLES } from '../constants'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

/* --------------------------------------------------------------------------
 * Read-only display of a value (shown until the cell is double-clicked).
 * ------------------------------------------------------------------------ */
function Display({ column, value }) {
  switch (column.type) {
    case 'select': {
      const styles = SELECT_STYLES[column.key]
      const cls =
        (styles && styles[value]) ||
        (value ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-slate-100 text-slate-400 ring-slate-200')
      return (
        <span
          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${cls}`}
        >
          {value || `${column.label}…`}
        </span>
      )
    }
    case 'boolean': {
      const yes = value === true
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
            yes ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${yes ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {yes ? 'Yes' : 'No'}
        </span>
      )
    }
    case 'date':
      return (
        <span className="block px-2.5 py-1.5 text-sm text-slate-800">
          {formatDate(value) || <span className="text-slate-400">—</span>}
        </span>
      )
    case 'link':
      return value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.3 3.7A1 1 0 0 0 4.8 4.6v10.8a1 1 0 0 0 1.5.9l9-5.4a1 1 0 0 0 0-1.7l-9-5.5z" />
          </svg>
          Watch
        </a>
      ) : (
        <span className="block px-2.5 py-1.5 text-sm text-slate-400">—</span>
      )
    default:
      return (
        <span className="block px-2.5 py-1.5 text-sm text-slate-800">
          {value || <span className="text-slate-400">—</span>}
        </span>
      )
  }
}

/* --------------------------------------------------------------------------
 * Inline input editor (text / number / date / url). Auto-focuses; commits on
 * blur or Enter, cancels on Escape. Calls onDone when finished.
 * ------------------------------------------------------------------------ */
function InlineInput({ value, type = 'text', onSave, onDone }) {
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select?.()
  }, [])

  const commit = () => {
    let next = draft === '' ? null : draft
    if (next !== null && type === 'number') {
      const n = Number(next)
      next = Number.isNaN(n) ? next : n
    }
    if (String(next ?? '') !== String(value ?? '')) onSave(next)
    onDone?.()
  }

  return (
    <input
      ref={inputRef}
      type={type}
      value={draft ?? ''}
      inputMode={type === 'number' ? 'decimal' : undefined}
      placeholder={type === 'url' ? 'https://…' : undefined}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        else if (e.key === 'Escape') onDone?.()
      }}
      className="w-full min-w-[8rem] rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm outline-none ring-2 ring-indigo-100"
    />
  )
}

/* --------------------------------------------------------------------------
 * Coloured dropdown editor — opens immediately, commits on change / blur.
 * ------------------------------------------------------------------------ */
function SelectEditor({ value, options, styles, placeholder, onSave, onDone }) {
  const cls = (styles && styles[value]) || (value ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-white ring-indigo-200')
  const opts = value && !options.includes(value) ? [value, ...options] : options
  const ref = useRef(null)

  useEffect(() => {
    ref.current?.focus()
    try {
      ref.current?.showPicker?.()
    } catch {
      /* showPicker needs a user gesture in some browsers — ignore if blocked */
    }
  }, [])

  return (
    <div className="relative inline-flex">
      <select
        ref={ref}
        value={value ?? ''}
        onChange={(e) => {
          onSave(e.target.value || null)
          onDone?.()
        }}
        onBlur={onDone}
        className={`w-auto cursor-pointer appearance-none whitespace-nowrap rounded-full py-1.5 pl-3 pr-7 text-xs font-semibold ring-2 ring-inset outline-none ${cls}`}
      >
        <option value="">{placeholder}…</option>
        {opts.map((o) => (
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
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handle} />
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
 * Double-click gate: shows a read-only display until double-clicked, then the
 * matching editor. Booleans toggle directly on double-click.
 * ------------------------------------------------------------------------ */
function EditableCell({ column, value, onSave }) {
  const [active, setActive] = useState(false)
  const done = () => setActive(false)

  // Booleans have no sub-editor — double-click flips the value.
  if (column.type === 'boolean') {
    return (
      <div
        onDoubleClick={() => onSave(!(value === true))}
        title="Double-click to toggle"
        className="inline-block cursor-default select-none"
      >
        <Display column={column} value={value} />
      </div>
    )
  }

  if (active) {
    if (column.type === 'select') {
      return (
        <SelectEditor
          value={value}
          options={column.options}
          styles={SELECT_STYLES[column.key]}
          placeholder={column.label}
          onSave={onSave}
          onDone={done}
        />
      )
    }
    const inputType = column.type === 'link' ? 'url' : column.type // text | number | date | url
    return <InlineInput value={value} type={inputType} onSave={onSave} onDone={done} />
  }

  return (
    <div
      onDoubleClick={() => setActive(true)}
      title="Double-click to edit"
      className="w-full cursor-default select-none"
    >
      <Display column={column} value={value} />
    </div>
  )
}

/* --------------------------------------------------------------------------
 * Dispatcher: pick the right cell for a column.
 * ------------------------------------------------------------------------ */
export default function CellEditor({ column, candidate, onSaveField, onUploadScan }) {
  const value = candidate[column.key]

  if (column.type === 'readonly') {
    return (
      <span className="block px-2.5 py-1.5 text-sm text-slate-500" title="From agency (read-only)">
        {value || <span className="text-slate-400">—</span>}
      </span>
    )
  }

  if (column.type === 'file') {
    return <FileCell value={value} onUpload={(file) => onUploadScan(candidate.id, file)} />
  }

  return (
    <EditableCell column={column} value={value} onSave={(v) => onSaveField(candidate.id, column.key, v)} />
  )
}
