// Shared option lists and column metadata for the candidate table.
// Option sets mirror the agency site so imported candidates match live.

export const STATUS_OPTIONS = ['In training', 'Done Training', 'CV sent', 'Selected']

export const MEDICAL_STATUS_OPTIONS = ['Fit', 'Booked', 'Unfit', 'No', 'In Progress', 'Expired']

export const COC_STATUS_OPTIONS = [
  'No',
  'Placed',
  'Order',
  'Mubarek',
  'Kalid',
  'Paran',
  'Pending release',
  'Booked',
  'Done',
]

export const MUSANED_STATUS_OPTIONS = ['Mubarek', 'Kalid', 'Paran', 'Placed', 'MRZ not clear']

export const TASHEER_OPTIONS = ['No', 'Booked', 'Done', 'Ready']

export const VISA_STATUS_OPTIONS = [
  'Ready for embassy',
  'Sent to Embassy',
  'Privately Sent',
  'Urgent',
  'Issued',
  'Visa canceled',
  'Arrived ksa',
  'Waiting Replacement',
  'Rejected from Embassy',
  'Returned',
]

export const CV_SENT_TO_OPTIONS = [
  'Not sent',
  'Saraya',
  'Quick',
  'Speed',
  'Speed Com',
  'Mersal',
  'Jedwa',
  'Jedwa Com.',
  'Sraco',
  'Sraco Com.',
  'Massadr',
  'Me and You',
  'Kuwait Gate',
  'Khuzam',
  'Khuzam P',
  'Syr',
  'Syr Com.',
]

export const SELECTED_BY_OPTIONS = [
  'Saraya M',
  'Speed M',
  'Sraco M',
  'Me and You M',
  'Massadr M',
  'Khuzam M',
  'Syr M',
  'Kuwait Gate M',
  'Quick K',
  'Mersal K',
  'Sraco K',
  'Alqafieai K',
  'Quick P',
  'Jedwa P',
  'Me and You P',
  'Khuzam P',
]

export const TICKET_OPTIONS = [
  'No',
  'New Order',
  'Ready',
  'Reserved',
  'Paid',
  'Booked',
  'Expired',
  'Exchange',
  'Urgent',
  'On Hold',
]

export const LMIS_OPTIONS = [
  'No COC',
  'Not tested',
  'Placed',
  'Rejected',
  'Draft',
  'Imported',
  'Checked',
  'Verified',
  'Pending',
  'Issued',
]

export const WOKALA_OPTIONS = ['Paid', 'Unpaid', 'Not Approved']

export const AVAILABILITY_STATUS_OPTIONS = ['Available', 'Selected', 'Unavailable']

export const PAYMENT_OPTIONS = ['Not Paid', 'Pending', 'Paid']

// Tailwind badge class sets (bg / text / ring) reused across the coloured
// status dropdowns.
const B = {
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  sky: 'bg-sky-100 text-sky-800 ring-sky-200',
  amber: 'bg-amber-100 text-amber-800 ring-amber-200',
  rose: 'bg-rose-100 text-rose-800 ring-rose-200',
  violet: 'bg-violet-100 text-violet-800 ring-violet-200',
  indigo: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  teal: 'bg-teal-100 text-teal-800 ring-teal-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export const STATUS_STYLES = {
  'In training': B.amber,
  'Done Training': B.sky,
  'CV sent': B.violet,
  Selected: B.emerald,
}

export const MEDICAL_STYLES = {
  Fit: B.emerald,
  Booked: B.sky,
  Unfit: B.rose,
  No: B.slate,
  'In Progress': B.amber,
  Expired: B.amber,
}

export const COC_STYLES = {
  No: B.slate,
  Placed: B.emerald,
  Order: B.sky,
  Mubarek: B.violet,
  Kalid: B.indigo,
  Paran: B.teal,
  'Pending release': B.amber,
  Booked: B.sky,
  Done: B.emerald,
}

export const MUSANED_STYLES = {
  Mubarek: B.violet,
  Kalid: B.indigo,
  Paran: B.teal,
  Placed: B.emerald,
  'MRZ not clear': B.rose,
}

export const TASHEER_STYLES = {
  No: B.slate,
  Booked: B.sky,
  Done: B.emerald,
  Ready: B.violet,
}

export const VISA_STYLES = {
  'Ready for embassy': B.sky,
  'Sent to Embassy': B.sky,
  'Privately Sent': B.indigo,
  Urgent: B.amber,
  Issued: B.emerald,
  'Visa canceled': B.rose,
  'Arrived ksa': B.emerald,
  'Waiting Replacement': B.amber,
  'Rejected from Embassy': B.rose,
  Returned: B.slate,
}

export const TICKET_STYLES = {
  No: B.slate,
  'New Order': B.violet,
  Ready: B.emerald,
  Reserved: B.amber,
  Paid: B.emerald,
  Booked: B.sky,
  Expired: B.rose,
  Exchange: B.amber,
  Urgent: B.rose,
  'On Hold': B.slate,
}

export const LMIS_STYLES = {
  'No COC': B.slate,
  'Not tested': B.slate,
  Placed: B.emerald,
  Rejected: B.rose,
  Draft: B.slate,
  Imported: B.sky,
  Checked: B.sky,
  Verified: B.emerald,
  Pending: B.amber,
  Issued: B.emerald,
}

export const WOKALA_STYLES = {
  Paid: B.emerald,
  Unpaid: B.amber,
  'Not Approved': B.rose,
}

export const AVAILABILITY_STYLES = {
  Available: B.emerald,
  Selected: B.indigo,
  Unavailable: B.rose,
}

export const PAYMENT_STYLES = {
  'Not Paid': B.rose,
  Pending: B.amber,
  Paid: B.emerald,
}

// Per-column badge palette. Columns not listed (cv_sent_to, selected_by) fall
// back to a neutral badge — they have too many values to colour meaningfully.
export const SELECT_STYLES = {
  current_status: STATUS_STYLES,
  medical_status: MEDICAL_STYLES,
  coc_status: COC_STYLES,
  musaned_status: MUSANED_STYLES,
  tasheer: TASHEER_STYLES,
  visa_status: VISA_STYLES,
  ticket: TICKET_STYLES,
  lmis: LMIS_STYLES,
  wokala: WOKALA_STYLES,
  availability_status: AVAILABILITY_STYLES,
  payment: PAYMENT_STYLES,
}

// Column definitions drive both the desktop table and the mobile cards.
// key     -> column in the `candidates` table
// label   -> human label
// type    -> how the cell is edited: text | number | select | date | link
// options -> for select columns
export const COLUMNS = [
  { key: 'name', label: 'Full Name', type: 'text', primary: true },
  { key: 'passport_number', label: 'Passport Number', type: 'text' },
  { key: 'labour_id', label: 'Labour ID', type: 'text' },
  // Manual-only fields — NOT imported or synced from the agency site.
  { key: 'narrative', label: 'Narrative Name', type: 'text' },
  { key: 'narrative_phone', label: 'Narrative Phone', type: 'text' },
  // Read-only mirror of the agency's narrative phone (imported + synced).
  { key: 'system_narrative_phone', label: 'System Narrative Phone', type: 'readonly' },
  { key: 'availability_status', label: 'Availability', type: 'select', options: AVAILABILITY_STATUS_OPTIONS },
  { key: 'medical_status', label: 'Medical Status', type: 'select', options: MEDICAL_STATUS_OPTIONS },
  { key: 'medical_date', label: 'Medical Date', type: 'date' },
  { key: 'coc_status', label: 'COC Status', type: 'select', options: COC_STATUS_OPTIONS },
  { key: 'musaned_status', label: 'Musaned Status', type: 'select', options: MUSANED_STATUS_OPTIONS },
  { key: 'tasheer', label: 'Tasheer', type: 'select', options: TASHEER_OPTIONS },
  { key: 'tasheer_date', label: 'Tasheer Date', type: 'date' },
  // Tracker-only yes/no flag.
  { key: 'tasheer_informed', label: 'Tasheer Informed', type: 'boolean' },
  { key: 'visa_status', label: 'Visa Status', type: 'select', options: VISA_STATUS_OPTIONS },
  { key: 'video_link', label: 'Video', type: 'link' },
  { key: 'cv_sent_to', label: 'CV Sent To', type: 'select', options: CV_SENT_TO_OPTIONS },
  { key: 'selected_by', label: 'Selected By', type: 'select', options: SELECTED_BY_OPTIONS },
  { key: 'ticket', label: 'Ticket', type: 'select', options: TICKET_OPTIONS },
  { key: 'ticket_date', label: 'Ticket Date', type: 'date' },
  // Tracker-only yes/no flag.
  { key: 'ticket_informed', label: 'Ticket Informed', type: 'boolean' },
  { key: 'lmis', label: 'LMIS', type: 'select', options: LMIS_OPTIONS },
  { key: 'wokala', label: 'Wakala', type: 'select', options: WOKALA_OPTIONS },
  // Tracker-only payment tracking.
  { key: 'payment', label: 'Payment', type: 'select', options: PAYMENT_OPTIONS },
  { key: 'amount', label: 'Amount', type: 'number' },
]
