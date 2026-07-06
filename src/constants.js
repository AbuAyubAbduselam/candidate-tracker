// Shared option lists and column metadata for the candidate table.

export const STATUS_OPTIONS = [
  'In training',
  'Done Training',
  'CV sent',
  'Selected',
]

export const TASHEER_OPTIONS = ['Booked', 'Done', 'Miss']

// Tailwind class sets used to colour the status / tasheer badges.
export const STATUS_STYLES = {
  'In training': 'bg-amber-100 text-amber-800 ring-amber-200',
  'Done Training': 'bg-sky-100 text-sky-800 ring-sky-200',
  'CV sent': 'bg-violet-100 text-violet-800 ring-violet-200',
  Selected: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
}

export const TASHEER_STYLES = {
  Booked: 'bg-sky-100 text-sky-800 ring-sky-200',
  Done: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  Miss: 'bg-rose-100 text-rose-800 ring-rose-200',
}

// Column definitions drive both the desktop table header and the mobile cards.
// key         -> column in the `candidates` table
// label       -> human label
// type        -> how the cell is edited: text | number | select | date | boolean | file
// options     -> for select columns
export const COLUMNS = [
  { key: 'name', label: 'Name', type: 'text', primary: true },
  { key: 'passport_number', label: 'Passport Number', type: 'text' },
  { key: 'labour_id', label: 'Labour ID', type: 'text' },
  { key: 'narrative', label: 'Narrative', type: 'text' },
  { key: 'narrative_phone', label: 'Narrative Phone', type: 'text' },
  { key: 'current_status', label: 'Current Status', type: 'select', options: STATUS_OPTIONS },
  { key: 'tasheer', label: 'Tasheer', type: 'select', options: TASHEER_OPTIONS },
  { key: 'tasheer_date', label: 'Tasheer Date', type: 'date' },
  { key: 'ticket', label: 'Ticket', type: 'text' },
  { key: 'ticket_date', label: 'Ticket Date', type: 'date' },
  { key: 'traveled', label: 'Traveled', type: 'boolean' },
  { key: 'payment', label: 'Payment', type: 'text' },
  { key: 'passport_scan_url', label: 'Passport Scan', type: 'file' },
]
