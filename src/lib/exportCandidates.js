// Excel / PDF export for selected candidate rows.
//
// This module pulls in the (fairly heavy) xlsx + jspdf libraries, so it is
// imported dynamically from the table — only downloaded when the user actually
// clicks an Export button.

import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Human-readable value for a candidate field, respecting the column type so the
// export matches what the table shows (Yes/No flags, plain dates, joined media).
export function exportCellValue(col, c) {
  if (col.type === 'gallery') {
    return [c.agency_avatar_url, c.agency_photo_url, c.agency_passport_scan_url]
      .filter(Boolean)
      .join(' | ')
  }
  const v = c[col.key]
  if (v === null || v === undefined || v === '') return ''
  if (col.type === 'boolean') return v === true ? 'Yes' : 'No'
  if (col.type === 'date' || col.format === 'date') {
    const s = String(v)
    return s.includes('T') ? s.slice(0, 10) : s
  }
  return String(v)
}

// yyyymmdd-hhmm timestamp used to keep exported filenames unique.
function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

// [{ 'Full Name': 'Jane', ... }] keyed by column label — one record per row.
function toRecords(rows, columns) {
  return rows.map((c) => {
    const rec = {}
    for (const col of columns) rec[col.label] = exportCellValue(col, c)
    return rec
  })
}

export function exportCandidatesToExcel(rows, columns, name = 'candidates') {
  const records = toRecords(rows, columns)
  const ws = XLSX.utils.json_to_sheet(records)

  // Size each column to fit its widest cell (clamped so URLs don't blow it out).
  ws['!cols'] = columns.map((col) => {
    const widest = records.reduce(
      (m, r) => Math.max(m, String(r[col.label] ?? '').length),
      col.label.length,
    )
    return { wch: Math.min(Math.max(widest + 2, 10), 50) }
  })
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: records.length, c: columns.length - 1 } }) }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Candidates')
  XLSX.writeFile(wb, `${name}-${stamp()}.xlsx`)
}

export function exportCandidatesToPdf(rows, columns, name = 'candidates') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const head = [columns.map((col) => col.label)]
  const body = rows.map((c) => columns.map((col) => exportCellValue(col, c)))

  autoTable(doc, {
    head,
    body,
    styles: { fontSize: 6.5, cellPadding: 2.5, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 6.5 },
    alternateRowStyles: { fillColor: [245, 246, 250] },
    margin: { top: 52, left: 20, right: 20, bottom: 24 },
    tableWidth: 'auto',
    didDrawPage: (data) => {
      doc.setFontSize(13)
      doc.setTextColor(30)
      doc.text('Candidate Tracker — Export', data.settings.margin.left, 34)
      doc.setFontSize(8)
      doc.setTextColor(120)
      doc.text(
        `${rows.length} candidate(s) · generated ${new Date().toLocaleString()}`,
        data.settings.margin.left,
        46,
      )
    },
  })
  doc.save(`${name}-${stamp()}.pdf`)
}
