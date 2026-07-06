import { COLUMNS } from '../constants'
import CellEditor from './EditableCell'

function DeleteButton({ onDelete, name }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm(`Delete "${name || 'this candidate'}"? This cannot be undone.`)) onDelete()
      }}
      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
      title="Delete candidate"
      aria-label="Delete candidate"
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path
          d="M4 6h12M8 6V4.5A1.5 1.5 0 019.5 3h1A1.5 1.5 0 0112 4.5V6m2 0v10a1 1 0 01-1 1H7a1 1 0 01-1-1V6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export default function CandidateTable({ candidates, onSaveField, onUploadScan, onDelete }) {
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" strokeLinecap="round" />
            <circle cx="10" cy="8" r="4" />
            <path d="M20 8v6M23 11h-6" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-700">No candidates found</h3>
        <p className="mt-1 max-w-xs text-sm text-slate-500">
          Add your first candidate, or adjust the filters to see more results.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* MOBILE / TABLET: card layout (default)                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-3 lg:hidden">
        {candidates.map((c) => (
          <div
            key={c.id}
            className="animate-pop rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur"
          >
            {/* Card header */}
            <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Name</div>
                <div className="-ml-2.5 text-base font-bold text-slate-900">
                  <CellEditor
                    column={COLUMNS[0]}
                    candidate={c}
                    onSaveField={onSaveField}
                    onUploadScan={onUploadScan}
                  />
                </div>
              </div>
              <DeleteButton onDelete={() => onDelete(c.id)} name={c.name} />
            </div>

            {/* Card body: two-column grid of fields */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">
              {COLUMNS.slice(1).map((col) => (
                <div key={col.key} className={col.type === 'file' ? 'col-span-2' : ''}>
                  <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {col.label}
                  </div>
                  <div className="-ml-2.5">
                    <CellEditor
                      column={col}
                      candidate={c}
                      onSaveField={onSaveField}
                      onUploadScan={onUploadScan}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* DESKTOP: full table                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm ring-1 ring-black/5 backdrop-blur lg:block">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidates.map((c) => (
                <tr key={c.id} className="group transition hover:bg-indigo-50/30">
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`px-1.5 py-1.5 align-middle ${col.primary ? 'font-semibold text-slate-900' : ''}`}
                    >
                      <CellEditor
                        column={col}
                        candidate={c}
                        onSaveField={onSaveField}
                        onUploadScan={onUploadScan}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right">
                    <DeleteButton onDelete={() => onDelete(c.id)} name={c.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
