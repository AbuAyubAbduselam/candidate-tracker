import { useEffect, useMemo, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  COLUMNS,
  AVAILABILITY_STATUS_OPTIONS,
  AVAILABILITY_STYLES,
  SELECTED_BY_OPTIONS,
} from '../constants'
import CellEditor from './EditableCell'

/* Availability tabs — filter candidates by availability status. */
const GROUP_KEY = 'availability_status'
const NO_STATUS = '__none__'

/* Sub-tabs inside the "Selected" tab — filter by the selector office
   (`selected_by`). */
const SELECTED_TAB = 'Selected'
const SELECTOR_KEY = 'selected_by'
const ALL_SELECTORS = '__all__'
const NO_SELECTOR = '__noselector__'

// These columns only make sense once a candidate is selected, so they're shown
// only on the "Selected" tab.
const SELECTED_ONLY_KEYS = new Set([
  'tasheer',
  'tasheer_date',
  'tasheer_informed',
  'visa_status',
  'selected_by',
  'selected_at',
  'ticket',
  'ticket_date',
  'ticket_informed',
  'lmis',
  'wokala',
  'payment',
  'amount',
])

// Image/URL columns are dropped from Excel/PDF exports — they're media, not
// tabular data.
const EXPORT_EXCLUDE_TYPES = new Set(['gallery', 'scan', 'file'])

// Column types the bulk editor can set the same value for. Readonly / media
// columns are excluded.
const BULK_EDIT_TYPES = new Set(['text', 'number', 'select', 'date', 'boolean', 'link'])

const BULK_INPUT_CLASS =
  'w-56 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400'

/* Value editor for the bulk updater — adapts to the chosen column's type. */
function BulkValueInput({ col, value, onChange }) {
  if (!col) {
    return (
      <input disabled placeholder="Choose a field first" className={`${BULK_INPUT_CLASS} opacity-60`} />
    )
  }
  if (col.type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={BULK_INPUT_CLASS}>
        <option value="">— clear —</option>
        {col.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }
  if (col.type === 'boolean') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={BULK_INPUT_CLASS}>
        <option value="">— clear —</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    )
  }
  const inputType = col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'
  return (
    <input
      type={inputType}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={col.type === 'link' ? 'https://…' : 'New value (empty = clear)'}
      className={BULK_INPUT_CLASS}
    />
  )
}

// First availability status that actually has candidates (falls back to the
// first option). Used to pick the initial tab and its default sort.
function firstPopulatedStatus(candidates) {
  return (
    AVAILABILITY_STATUS_OPTIONS.find((s) => candidates.some((c) => (c[GROUP_KEY] || '') === s)) ||
    AVAILABILITY_STATUS_OPTIONS[0]
  )
}

// The Selected tab defaults to newest contract first (selected_at descending);
// every other tab starts unsorted.
function defaultSortFor(status) {
  return status === SELECTED_TAB ? [{ id: 'selected_at', desc: true }] : []
}

// Group digits, keep up to 2 decimals — used for the payment amount totals.
function formatAmount(n) {
  return (n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

// Build the selector-office sub-tabs from the Selected candidates. Preserves the
// canonical SELECTED_BY_OPTIONS order, then appends any extra values, then a
// "No selector" bucket. Returns { total, tabs }.
function buildSelectorTabs(candidates) {
  const counts = new Map()
  for (const c of candidates) {
    if ((c[GROUP_KEY] || '') !== SELECTED_TAB) continue
    const v = (c[SELECTOR_KEY] || '').trim() || NO_SELECTOR
    counts.set(v, (counts.get(v) || 0) + 1)
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  const ordered = SELECTED_BY_OPTIONS.filter((s) => counts.has(s)).map((s) => ({
    key: s,
    label: s,
    count: counts.get(s),
  }))
  const extra = [...counts.keys()]
    .filter((k) => k !== NO_SELECTOR && !SELECTED_BY_OPTIONS.includes(k))
    .map((k) => ({ key: k, label: k, count: counts.get(k) }))
  const none = counts.get(NO_SELECTOR)
    ? [{ key: NO_SELECTOR, label: 'No selector', count: counts.get(NO_SELECTOR) }]
    : []
  return { total, tabs: [...ordered, ...extra, ...none] }
}

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

/* Row-selection checkbox (supports an indeterminate "some selected" state for
   the header select-all box). */
function RowCheckbox({ checked, indeterminate = false, onChange, title }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !checked && indeterminate
  }, [checked, indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      title={title}
      aria-label={title}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600 focus:ring-indigo-500"
    />
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

/* Date/timestamp sort — parses plain dates and full timestamps; missing values
   sort to the bottom (they become the smallest, so last in a desc sort). */
const dateSort = (rowA, rowB, columnId) => {
  const ms = (v) => {
    if (!v) return -Infinity
    const iso = typeof v === 'string' && !v.includes('T') ? `${v}T00:00:00` : v
    const n = Date.parse(iso)
    return Number.isNaN(n) ? -Infinity : n
  }
  return ms(rowA.getValue(columnId)) - ms(rowB.getValue(columnId))
}

export default function CandidateTable({
  candidates,
  onSaveField,
  onUploadScan,
  onDelete,
  onSync,
  onBulkUpdate,
  agencyEnabled = false,
}) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  // Row selection (keyed by candidate id via getRowId) + export busy flag.
  const [rowSelection, setRowSelection] = useState({})
  const [exporting, setExporting] = useState(false)
  // Bulk editor (set one field to the same value across all selected rows).
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkField, setBulkField] = useState('')
  const [bulkValue, setBulkValue] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [activeStatus, setActiveStatus] = useState(() => firstPopulatedStatus(candidates))
  const [sorting, setSorting] = useState(() => defaultSortFor(firstPopulatedStatus(candidates)))
  // Which selector-office sub-tab is active (only used on the Selected tab).
  const [activeSelector, setActiveSelector] = useState(ALL_SELECTORS)
  // Top-level travel filter — 'untraveled' (default) shows everyone whose
  // traveled value is not Yes; 'traveled' shows only traveled === true.
  const [activeTraveled, setActiveTraveled] = useState('untraveled')

  // Everything below the travel tabs operates on this pre-filtered set, so the
  // availability tabs, office sub-tabs and counts all reflect the travel view.
  const travelFiltered = useMemo(
    () =>
      candidates.filter((c) =>
        activeTraveled === 'traveled' ? c.traveled === true : c.traveled !== true,
      ),
    [candidates, activeTraveled],
  )
  const travelCounts = useMemo(() => {
    const traveled = candidates.reduce((n, c) => n + (c.traveled === true ? 1 : 0), 0)
    return { traveled, untraveled: candidates.length - traveled }
  }, [candidates])

  const tabs = useMemo(() => buildTabs(travelFiltered), [travelFiltered])
  const selectorInfo = useMemo(() => buildSelectorTabs(travelFiltered), [travelFiltered])
  const onSelected = activeStatus === SELECTED_TAB

  const visibleCandidates = useMemo(() => {
    const list = travelFiltered.filter((c) => (c[GROUP_KEY] || NO_STATUS) === activeStatus)
    if (!onSelected || activeSelector === ALL_SELECTORS) return list
    return list.filter((c) => ((c[SELECTOR_KEY] || '').trim() || NO_SELECTOR) === activeSelector)
  }, [travelFiltered, activeStatus, onSelected, activeSelector])
  const activeTab = tabs.find((t) => t.key === activeStatus)

  // Payment tally for untraveled + Selected candidates: Paid vs Not Paid
  // (Not Paid = any payment value other than 'Paid', including blank). Also sums
  // the amount column into Total, Paid and Unpaid (= Total − Paid).
  const paymentSummary = useMemo(() => {
    if (activeTraveled !== 'untraveled') return null
    const sel = candidates.filter(
      (c) => c.traveled !== true && (c[GROUP_KEY] || '') === SELECTED_TAB,
    )
    const num = (v) => {
      const n = parseFloat(v)
      return Number.isNaN(n) ? 0 : n
    }
    const paidRows = sel.filter((c) => c.payment === 'Paid')
    const totalAmount = sel.reduce((s, c) => s + num(c.amount), 0)
    const paidAmount = paidRows.reduce((s, c) => s + num(c.amount), 0)
    return {
      paid: paidRows.length,
      notPaid: sel.length - paidRows.length,
      total: sel.length,
      totalAmount,
      paidAmount,
      unpaidAmount: totalAmount - paidAmount,
    }
  }, [candidates, activeTraveled])

  // If the active selector-office disappears (data changed, or we left the
  // Selected tab), fall back to "All" so the list never silently empties.
  useEffect(() => {
    if (activeSelector === ALL_SELECTORS) return
    if (!onSelected || !selectorInfo.tabs.some((t) => t.key === activeSelector)) {
      setActiveSelector(ALL_SELECTORS)
    }
  }, [onSelected, activeSelector, selectorInfo])

  // The Selected-workflow columns only show on the "Selected" tab.
  const activeColumns = useMemo(
    () =>
      activeStatus === 'Selected' ? COLUMNS : COLUMNS.filter((c) => !SELECTED_ONLY_KEYS.has(c.key)),
    [activeStatus],
  )

  const columns = useMemo(() => {
    const selectColumn = {
      id: 'select',
      enableSorting: false,
      header: ({ table }) => (
        <RowCheckbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          title="Select all on this page"
        />
      ),
      cell: ({ row }) => (
        <RowCheckbox
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          title="Select row"
        />
      ),
    }

    const dataColumns = activeColumns.map((col) => ({
      id: col.key,
      accessorKey: col.key,
      header: col.label,
      enableSorting:
        col.type !== 'file' && col.type !== 'link' && col.type !== 'scan' && col.type !== 'gallery',
      sortingFn:
        col.type === 'select'
          ? optionOrderSort(col.options)
          : col.type === 'number'
            ? numericSort
            : col.type === 'date' || col.format === 'date'
              ? dateSort
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

    return [selectColumn, ...dataColumns]
  }, [activeColumns])

  const table = useReactTable({
    data: visibleCandidates,
    columns,
    state: { sorting, pagination, rowSelection },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
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

  // Which columns land in the export — the visible data columns for the active
  // tab, minus the media/URL columns.
  const exportColumns = useMemo(
    () => activeColumns.filter((c) => !EXPORT_EXCLUDE_TYPES.has(c.type)),
    [activeColumns],
  )
  const selectedRows = table.getSelectedRowModel().rows
  const selectedCount = selectedRows.length

  // Lazy-load the heavy xlsx/jspdf bundle only when an export is triggered.
  async function runExport(kind) {
    const rows = table.getSelectedRowModel().rows.map((r) => r.original)
    if (rows.length === 0) return
    setExporting(true)
    try {
      const mod = await import('../lib/exportCandidates')
      if (kind === 'excel') mod.exportCandidatesToExcel(rows, exportColumns)
      else mod.exportCandidatesToPdf(rows, exportColumns)
    } catch (err) {
      console.error('Export failed', err)
      window.alert(`Export failed: ${err?.message || err}`)
    } finally {
      setExporting(false)
    }
  }

  // Fields the bulk editor can set (visible, editable columns for this tab).
  const editableColumns = useMemo(
    () => activeColumns.filter((c) => BULK_EDIT_TYPES.has(c.type)),
    [activeColumns],
  )
  const bulkCol = editableColumns.find((c) => c.key === bulkField)

  // Close / reset the bulk editor whenever the selection empties (also fires on
  // tab switches, which clear the selection).
  useEffect(() => {
    if (selectedCount === 0) {
      setBulkOpen(false)
      setBulkField('')
      setBulkValue('')
    }
  }, [selectedCount])

  // Apply the chosen value to every selected candidate.
  async function applyBulk() {
    if (!bulkCol) return
    const ids = table.getSelectedRowModel().rows.map((r) => r.original.id)
    if (ids.length === 0) return
    let value = bulkValue
    if (bulkCol.type === 'boolean') {
      value = bulkValue === 'true' ? true : bulkValue === 'false' ? false : null
    } else if (bulkValue === '') {
      value = null
    } else if (bulkCol.type === 'number') {
      // Match the inline editor: store real numbers, keep raw text if unparseable.
      const n = Number(bulkValue)
      value = Number.isNaN(n) ? bulkValue : n
    }
    setBulkBusy(true)
    try {
      await onBulkUpdate(ids, bulkCol.key, value)
      setBulkOpen(false)
      setBulkField('')
      setBulkValue('')
    } finally {
      setBulkBusy(false)
    }
  }

  const renderCard = (row) => {
    const c = row.original
    const selected = row.getIsSelected()
    return (
    <div
      key={c.id}
      className={`animate-pop rounded-2xl border bg-white/90 p-4 shadow-sm backdrop-blur ${
        selected ? 'border-indigo-300 ring-2 ring-indigo-400' : 'border-white/60 ring-1 ring-black/5'
      }`}
    >
      {/* Card header */}
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="pt-1">
            <RowCheckbox
              checked={selected}
              onChange={row.getToggleSelectedHandler()}
              title="Select candidate"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Name</div>
            <div className="-ml-2.5 text-base font-bold text-slate-900">
              <CellEditor column={COLUMNS[0]} candidate={c} onSaveField={onSaveField} onUploadScan={onUploadScan} />
            </div>
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
          <div
            key={col.key}
            className={col.type === 'file' || col.type === 'scan' || col.type === 'gallery' ? 'col-span-2' : ''}
          >
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
  }

  const renderLeafRow = (row) => {
    const selected = row.getIsSelected()
    return (
    <tr
      key={row.id}
      className={`group transition ${selected ? 'bg-indigo-50/70' : 'bg-white hover:bg-indigo-50/40'}`}
    >
      {row.getVisibleCells().map((cell) => {
        const isPrimary = cell.column.columnDef.meta?.primary
        const isActions = cell.column.id === 'actions'
        const isSelect = cell.column.id === 'select'
        return (
          <td
            key={cell.id}
            className={`align-middle ${
              isActions ? 'px-2 py-1.5 text-right' : isSelect ? 'px-3 py-1.5 text-center' : 'px-1.5 py-1.5'
            } ${
              isPrimary
                ? `sticky left-0 z-10 font-semibold text-slate-900 ${
                    selected ? 'bg-indigo-50' : 'bg-white group-hover:bg-indigo-50'
                  }`
                : ''
            }`}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        )
      })}
    </tr>
    )
  }

  return (
    <>
      {/* Top-level travel tabs — Untraveled (default) vs Traveled */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { key: 'untraveled', label: 'Untraveled', count: travelCounts.untraveled },
          { key: 'traveled', label: 'Traveled', count: travelCounts.traveled },
        ].map((t) => {
          const active = t.key === activeTraveled
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setActiveTraveled(t.key)
                setActiveSelector(ALL_SELECTORS)
                setRowSelection({})
                setPagination((p) => ({ ...p, pageIndex: 0 }))
              }}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-inset transition ${
                active
                  ? 'bg-slate-900 text-white ring-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                  active ? 'bg-white/25' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

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
                setActiveSelector(ALL_SELECTORS)
                setSorting(defaultSortFor(t.key))
                setRowSelection({})
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

      {/* Selector-office sub-tabs — only on the Selected tab; filter by who
          selected the candidate (`selected_by`). */}
      {onSelected && selectorInfo.total > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-2.5">
          <span className="pl-1 pr-1 text-[11px] font-bold uppercase tracking-wide text-indigo-400">
            Office
          </span>
          {[{ key: ALL_SELECTORS, label: 'All', count: selectorInfo.total }, ...selectorInfo.tabs].map(
            (t) => {
              const active = t.key === activeSelector
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setActiveSelector(t.key)
                    setRowSelection({})
                    setPagination((p) => ({ ...p, pageIndex: 0 }))
                  }}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                    active
                      ? 'bg-indigo-600 text-white ring-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? 'bg-white/25' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              )
            },
          )}
        </div>
      )}

      {/* Payment tally for untraveled Selected candidates: Paid vs Not Paid
          counts, plus Total / Unpaid / Paid amount sums. */}
      {onSelected && paymentSummary && paymentSummary.total > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Payment
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
            Paid
            <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[11px] font-bold">
              {paymentSummary.paid}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 font-semibold text-rose-800 ring-1 ring-inset ring-rose-200">
            Not Paid
            <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[11px] font-bold">
              {paymentSummary.notPaid}
            </span>
          </span>

          <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Amount
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
            Total
            <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[11px] font-bold">
              {formatAmount(paymentSummary.totalAmount)}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
            Unpaid
            <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[11px] font-bold">
              {formatAmount(paymentSummary.unpaidAmount)}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
            Paid
            <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[11px] font-bold">
              {formatAmount(paymentSummary.paidAmount)}
            </span>
          </span>
        </div>
      )}

      {/* Selection toolbar — appears once one or more rows are ticked; exports
          the selected candidates to Excel or PDF. */}
      {selectedCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 p-2.5 shadow-sm">
          <span className="inline-flex items-center gap-1.5 pl-1 text-sm font-semibold text-indigo-700">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {selectedCount} selected
          </span>
          <span className="mx-1 hidden h-5 w-px bg-indigo-200 sm:block" />

          <button
            type="button"
            onClick={() => runExport('excel')}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 2.5H5.5A1.5 1.5 0 0 0 4 4v12a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 16V6.5z" strokeLinejoin="round" />
              <path d="M12 2.5V6a1 1 0 0 0 1 1h3M7.5 10.5l5 4m0-4-5 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export Excel
          </button>

          <button
            type="button"
            onClick={() => runExport('pdf')}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 active:scale-95 disabled:opacity-60"
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 2.5H5.5A1.5 1.5 0 0 0 4 4v12a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 16V6.5z" strokeLinejoin="round" />
              <path d="M12 2.5V6a1 1 0 0 0 1 1h3M7 11h6M7 13.5h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export PDF
          </button>

          {onBulkUpdate && (
            <button
              type="button"
              onClick={() => setBulkOpen((v) => !v)}
              aria-expanded={bulkOpen}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 ${
                bulkOpen
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-800 text-white hover:bg-slate-900'
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M13.5 3.5 16.5 6.5 7 16H4v-3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Bulk edit
            </button>
          )}

          {exporting && (
            <svg className="h-4 w-4 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}

          <button
            type="button"
            onClick={() => setRowSelection({})}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      )}

      {/* Bulk editor — set one field to the same value for every selected row. */}
      {onBulkUpdate && bulkOpen && selectedCount > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Field</span>
              <select
                value={bulkField}
                onChange={(e) => {
                  setBulkField(e.target.value)
                  setBulkValue('')
                }}
                className={BULK_INPUT_CLASS}
              >
                <option value="">Choose field…</option>
                {editableColumns.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">New value</span>
              <BulkValueInput col={bulkCol} value={bulkValue} onChange={setBulkValue} />
            </label>

            <button
              type="button"
              onClick={applyBulk}
              disabled={!bulkCol || bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
            >
              {bulkBusy && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              Apply to {selectedCount}
            </button>

            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Applies to all {selectedCount} selected candidate{selectedCount > 1 ? 's' : ''}. Leave the value
            empty to clear the field.
          </p>
        </div>
      )}

      {visibleCandidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center text-sm text-slate-500">
          No candidates with status “{activeTab?.label ?? activeStatus}”.
        </div>
      ) : (
        <>
          {/* ---------------------------------------------------------------- */}
          {/* MOBILE / TABLET: card layout (default)                          */}
          {/* ---------------------------------------------------------------- */}
          <div className="space-y-3 lg:hidden">{sortedRows.map((row) => renderCard(row))}</div>

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
