import { STATUS_OPTIONS, TASHEER_OPTIONS } from '../constants'

const selectCls =
  'w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function Filters({ filters, setFilters, total, shown }) {
  const update = (patch) => setFilters((f) => ({ ...f, ...patch }))
  const hasActive = filters.status || filters.tasheer || filters.traveled || filters.search

  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur sm:p-4">
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m17 17-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search name, passport, labour ID…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Dropdown filters */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => update({ status: e.target.value })}
              className={selectCls}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <Chevron />
          </div>

          <div className="relative">
            <select
              value={filters.tasheer}
              onChange={(e) => update({ tasheer: e.target.value })}
              className={selectCls}
            >
              <option value="">All tasheer</option>
              {TASHEER_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <Chevron />
          </div>

          <div className="relative">
            <select
              value={filters.traveled}
              onChange={(e) => update({ traveled: e.target.value })}
              className={selectCls}
            >
              <option value="">All travel</option>
              <option value="yes">Traveled</option>
              <option value="no">Not traveled</option>
            </select>
            <Chevron />
          </div>
        </div>

        {/* Result count + clear */}
        <div className="flex items-center justify-between px-0.5">
          <p className="text-xs font-medium text-slate-500">
            Showing <span className="font-bold text-slate-700">{shown}</span> of{' '}
            <span className="font-bold text-slate-700">{total}</span>
          </p>
          {hasActive && (
            <button
              type="button"
              onClick={() => setFilters({ search: '', status: '', tasheer: '', traveled: '' })}
              className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
