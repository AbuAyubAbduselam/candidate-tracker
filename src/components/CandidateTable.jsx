import { useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { COLUMNS, AVAILABILITY_STATUS_OPTIONS, AVAILABILITY_STYLES } from '../constants'
import CellEditor from './EditableCell'

/* Availability tabs — filter candidates by availability status. */
const GROUP_KEY = 'availability_status'
const NO_STATUS = '__none__'

// These columns only make sense once a candidate is selected, so they're shown
// only on the "Selected" tab.
const SELECTED_ONLY_KEYS = new Set([
  'tasheer',
  'tasheer_date',
  'tasheer_informed',
  'visa_status',
  'selected_by',
  'ticket',
  'ticket_date',
  'ticket_informed',
  'lmis',
  'wokala',
  'payment',
  'amount',
])

// Always show the three canonical statuses; append any extra/none statuses
// found in the data so no candidate is unreachable.
function buildTabs(candidates) {
  const counts = new Map()
  for (const c of candidates) {
    const v = c[GROUP_KEY] || NO_STATUS
    counts.set(v, (counts.get(v) || 0) + 1)
  }
  const base = AVAILABILITY_STATUS_OPTIONS.map((s) => ({ key: s, label: s, count: counts.get(s) || 0 }))
  const extra = [...counts.keys()]
    .filter((k) => k !== NO_STATUS && !AVAILABILITY_STATUS_OPTIONS.includes(k))
    .map((k) => ({ key: k, label: k, count: counts.get(k) }))
  const none = counts.get(NO_STATUS)
    ? [{ key: NO_STATUS, label: 'No status', count: counts.get(NO_STATUS) }]
    : []
  return [...base, ...extra, ...none]
}

function SyncButton({ onSync }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await onSync()
        } finally {
          setBusy(false)
        }
      }}
      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-60"
      title="Sync this candidate from the agency database"
      aria-label="Sync from agency"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={busy ? 'animate-spin' : ''}
      >
        <path d="M16 4v4h-4M4 16v-4h4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15.5 8a6 6 0 0 0-10.9-1.5M4.5 12a6 6 0 0 0 10.9 1.5" strokeLinecap="round" />
      </svg>
    </button>
  )
}

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

/* Sort chevrons shown in each sortable header. */
function SortIndicator({ sorted }) {
  return (
    <span className="ml-1 inline-flex flex-col leading-none">
      <svg
        width="8"
        height="6"
        viewBox="0 0 8 6"
        className={`transition ${sorted === 'asc' ? 'text-indigo-600' : 'text-slate-300'}`}
        fill="currentColor"
      >
        <path d="M4 0 8 6H0z" />
      </svg>
      <svg
        width="8"
        height="6"
        viewBox="0 0 8 6"
        className={`mt-0.5 transition ${sorted === 'desc' ? 'text-indigo-600' : 'text-slate-300'}`}
        fill="currentColor"
      >
        <path d="M4 6 0 0h8z" />
      </svg>
    </span>
  )
}

/* Keep select columns (status / tasheer) in their natural workflow order
   instead of plain alphabetical when sorting. */
const optionOrderSort = (options) => (rowA, rowB, columnId) => {
  const rank = (v) => (v ? options.indexOf(v) : -1)
  return rank(rowA.getValue(columnId)) - rank(rowB.getValue(columnId))
}

/* Numeric sort (values come back from the DB as strings). */
const numericSort = (rowA, rowB, columnId) => {
  const num = (v) => {
    const n = parseFloat(v)
    return Number.isNaN(n) ? -Infinity : n
  }
  return num(rowA.getValue(columnId)) - num(rowB.getValue(columnId))
}

export default function CandidateTable({
  candidates,
  onSaveField,
  onUploadScan,
  onDelete,
  onSync,
  agencyEnabled = false,
}) {
  const [sorting, setSorting] = useState([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [activeStatus, setActiveStatus] = useState(
    () =>
      AVAILABILITY_STATUS_OPTIONS.find((s) => candidates.some((c) => (c[GROUP_KEY] || '') === s)) ||
      AVAILABILITY_STATUS_OPTIONS[0],
  )

  const tabs = useMemo(() => buildTabs(candidates), [candidates])
  const visibleCandidates = useMemo(
    () => candidates.filter((c) => (c[GROUP_KEY] || NO_STATUS) === activeStatus),
    [candidates, activeStatus],
  )
  const activeTab = tabs.find((t) => t.key === activeStatus)

  // The Selected-workflow columns only show on the "Selected" tab.
  const activeColumns = useMemo(
    () =>
      activeStatus === 'Selected' ? COLUMNS : COLUMNS.filter((c) => !SELECTED_ONLY_KEYS.has(c.key)),
    [activeStatus],
  )

  const columns = useMemo(() => {
    const dataColumns = activeColumns.map((col) => ({
      id: col.key,
      accessorKey: col.key,
      header: col.label,
      enableSorting: col.type !== 'file' && col.type !== 'link',
      sortingFn:
        col.type === 'select'
          ? optionOrderSort(col.options)
          : col.type === 'number'
            ? numericSort
            : 'auto',
      meta: { primary: col.primary },
      cell: ({ row, table }) => (
        <CellEditor
          column={col}
          candidate={row.original}
          onSaveField={table.options.meta.onSaveField}
          onUploadScan={table.options.meta.onUploadScan}
        />
      ),
    }))

    dataColumns.push({
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row, table }) => {
        const meta = table.options.meta
        return (
          <div className="flex items-center justify-end gap-0.5">
            {meta.agencyEnabled && meta.onSync && (
              <SyncButton onSync={() => meta.onSync(row.original)} />
            )}
            <DeleteButton onDelete={() => meta.onDelete(row.original.id)} name={row.original.name} />
          </div>
        )
      },
    })

    return dataColumns
  }, [activeColumns])

  const table = useReactTable({
    data: visibleCandidates,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false, // don't jump to page 1 on inline edits
    meta: { onSaveField, onUploadScan, onDelete, onSync, agencyEnabled },
  })

  // Keep the page index in range when the visible set shrinks (filter/tab/delete).
  const pageCount = Math.max(1, Math.ceil(visibleCandidates.length / pagination.pageSize))
  useEffect(() => {
    if (pagination.pageIndex > pageCount - 1) {
      setPagination((p) => ({ ...p, pageIndex: pageCount - 1 }))
    }
  }, [pageCount, pagination.pageIndex])

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

  const sortedRows = table.getRowModel().rows

  const renderCard = (c) => (
    <div
      key={c.id}
      className="animate-pop rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur"
    >
      {/* Card header */}
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Name</div>
          <div className="-ml-2.5 text-base font-bold text-slate-900">
            <CellEditor column={COLUMNS[0]} candidate={c} onSaveField={onSaveField} onUploadScan={onUploadScan} />
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {agencyEnabled && onSync && <SyncButton onSync={() => onSync(c)} />}
          <DeleteButton onDelete={() => onDelete(c.id)} name={c.name} />
        </div>
      </div>

      {/* Card body: two-column grid of fields */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {activeColumns.slice(1).map((col) => (
          <div key={col.key} className={col.type === 'file' ? 'col-span-2' : ''}>
            <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {col.label}
            </div>
            <div className="-ml-2.5">
              <CellEditor column={col} candidate={c} onSaveField={onSaveField} onUploadScan={onUploadScan} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderLeafRow = (row) => (
    <tr key={row.id} className="group bg-white transition hover:bg-indigo-50/40">
      {row.getVisibleCells().map((cell) => {
        const isPrimary = cell.column.columnDef.meta?.primary
        const isActions = cell.column.id === 'actions'
        return (
          <td
            key={cell.id}
            className={`align-middle ${
              isActions ? 'px-2 py-1.5 text-right' : 'px-1.5 py-1.5'
            } ${isPrimary ? 'sticky left-0 z-10 bg-white font-semibold text-slate-900 group-hover:bg-indigo-50' : ''}`}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        )
      })}
    </tr>
  )

  return (
    <>
      {/* Availability status tabs — always visible; click to filter the list */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const active = t.key === activeStatus
          const activeCls = AVAILABILITY_STYLES[t.key] || 'bg-slate-800 text-white ring-slate-800'
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setActiveStatus(t.key)
                setSorting([])
                setPagination((p) => ({ ...p, pageIndex: 0 }))
              }}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-inset transition ${
                active
                  ? `${activeCls} shadow-sm`
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                  active ? 'bg-white/50' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {visibleCandidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center text-sm text-slate-500">
          No candidates with status “{activeTab?.label ?? activeStatus}”.
        </div>
      ) : (
        <>
          {/* ---------------------------------------------------------------- */}
          {/* MOBILE / TABLET: card layout (default)                          */}
          {/* ---------------------------------------------------------------- */}
          <div className="space-y-3 lg:hidden">{sortedRows.map((row) => renderCard(row.original))}</div>

          {/* ---------------------------------------------------------------- */}
          {/* DESKTOP: TanStack Table                                         */}
          {/* ---------------------------------------------------------------- */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5 lg:block">
            <div className="scroll-thin max-h-[70vh] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-20">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-slate-200 bg-slate-50">
                      {headerGroup.headers.map((header) => {
                        const canSort = header.column.getCanSort()
                        const sorted = header.column.getIsSorted()
                        const isPrimary = header.column.columnDef.meta?.primary
                        return (
                          <th
                            key={header.id}
                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                            aria-sort={
                              sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                            }
                            className={`whitespace-nowrap bg-slate-50 px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 transition ${
                              canSort ? 'cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700' : ''
                            } ${isPrimary ? 'sticky left-0 z-10' : ''} ${sorted ? 'text-indigo-600' : ''}`}
                          >
                            <div className="flex items-center">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {canSort && <SortIndicator sorted={sorted} />}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRows.map((row) => renderLeafRow(row))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination controls */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>
                {visibleCandidates.length === 0
                  ? 0
                  : pagination.pageIndex * pagination.pageSize + 1}
                –{Math.min(visibleCandidates.length, (pagination.pageIndex + 1) * pagination.pageSize)} of{' '}
                <span className="font-semibold text-slate-700">{visibleCandidates.length}</span>
              </span>
              <span className="text-slate-300">·</span>
              <label className="flex items-center gap-1">
                <select
                  value={pagination.pageSize}
                  onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none focus:border-indigo-400"
                >
                  {[20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                per page
              </label>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                «
              </button>
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2 text-xs font-medium text-slate-500">
                Page <span className="font-bold text-slate-700">{pagination.pageIndex + 1}</span> of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => table.setPageIndex(pageCount - 1)}
                disabled={!table.getCanNextPage()}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                »
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
