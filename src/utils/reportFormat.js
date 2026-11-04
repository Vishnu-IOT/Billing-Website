/* ===== REPORT CELL FORMATTING (screen, Excel, PDF, print share one source) ===== */
import { formatCurrency } from './currency';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM-DD' strings are calendar dates — parse them as LOCAL dates so they
// never shift a day in timezones behind UTC. Full timestamps use the browser zone.
export function fmtDate(v) {
  if (!v) return '—';
  let d;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, day] = v.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(v);
  }
  if (Number.isNaN(d.getTime())) return String(v);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export const fmtNumber = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
export const fmtMoneyPlain = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const rawValue = (col, row) => (col.get ? col.get(row) : row[col.key]);
export const isNumericCol = (col) => ['currency', 'number', 'percent'].includes(col.type);

// Text shown on screen / in print. `plainMoney` drops the ₹ glyph (jsPDF's
// built-in fonts cannot render it).
export function displayValue(col, row, { plainMoney = false } = {}) {
  const v = rawValue(col, row);
  switch (col.type) {
    case 'currency': return plainMoney ? fmtMoneyPlain(v) : formatCurrency(v);
    case 'number': return v === null || v === undefined || v === '' ? '—' : fmtNumber(v);
    case 'percent': return v === null || v === undefined || v === '' ? '—' : `${Number(v)}%`;
    case 'date': return fmtDate(v);
    default: return v === null || v === undefined || v === '' ? '—' : String(v);
  }
}

// Value written to Excel: real numbers for numeric columns so sums work.
export function excelValue(col, row) {
  const v = rawValue(col, row);
  if (isNumericCol(col)) return v === null || v === undefined || v === '' ? 0 : Number(v);
  if (col.type === 'date') return v ? fmtDate(v) : '';
  return v ?? '';
}

export function summaryDisplay(card, value, opts) {
  if (value === undefined || value === null) return '—';
  return card.type === 'currency' ? (opts?.plainMoney ? fmtMoneyPlain(value) : formatCurrency(value)) : fmtNumber(value);
}
