/* ===== REPORT DATE HELPERS — local-date safe (no toISOString/UTC shift) ===== */

export const pad2 = (n) => String(n).padStart(2, '0');
export const localISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Indian financial year: Apr → Mar. Returns the START year of the FY containing `d`.
export const fyStartYear = (d = new Date()) => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);
export const fyLabel = (startYear) => `${startYear}-${pad2((startYear + 1) % 100)}`;

export const QUICK_RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisQuarter', label: 'This Quarter' },
  { key: 'thisFY', label: 'This Financial Year' },
  { key: 'lastFY', label: 'Last Financial Year' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

// → { fromDate, toDate } ('' when open-ended)
export function getQuickRange(key, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (key) {
    case 'today':
      return { fromDate: localISO(now), toDate: localISO(now) };
    case 'yesterday': {
      const t = new Date(y, m, d - 1);
      return { fromDate: localISO(t), toDate: localISO(t) };
    }
    case 'thisWeek': {
      const dow = (now.getDay() + 6) % 7; // Monday start
      return { fromDate: localISO(new Date(y, m, d - dow)), toDate: localISO(now) };
    }
    case 'thisMonth':
      return { fromDate: localISO(new Date(y, m, 1)), toDate: localISO(new Date(y, m + 1, 0)) };
    case 'lastMonth':
      return { fromDate: localISO(new Date(y, m - 1, 1)), toDate: localISO(new Date(y, m, 0)) };
    case 'thisQuarter': {
      const qStart = Math.floor(m / 3) * 3;
      return { fromDate: localISO(new Date(y, qStart, 1)), toDate: localISO(new Date(y, qStart + 3, 0)) };
    }
    case 'thisFY': {
      const s = fyStartYear(now);
      return { fromDate: `${s}-04-01`, toDate: `${s + 1}-03-31` };
    }
    case 'lastFY': {
      const s = fyStartYear(now) - 1;
      return { fromDate: `${s}-04-01`, toDate: `${s + 1}-03-31` };
    }
    default:
      return { fromDate: '', toDate: '' };
  }
}

// Last `count` financial years, newest first — for the GST "Financial Year" select.
export function getFinancialYearOptions(count = 6, now = new Date()) {
  const s = fyStartYear(now);
  return Array.from({ length: count }, (_, i) => ({ value: fyLabel(s - i), label: `FY ${fyLabel(s - i)}` }));
}

// Months in FY order (Apr … Mar). `value` is the calendar month number 1–12.
export const FY_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((n) => ({
  value: String(n),
  label: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][n - 1],
}));
