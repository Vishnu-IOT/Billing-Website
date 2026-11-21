/* ===== DATE UTILITIES ===== */

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function formatDateInput(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

export function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = String(dateStr).slice(0, 10).split('-');
  if (!year || !month || !day) return '';
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

export function parseDateFromInput(value) {
  const input = String(value || '').trim();
  if (!input) return '';

  let day;
  let month;
  let year;
  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (isoMatch) {
    [, year, month, day] = isoMatch;
  } else {
    const match = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    [, day, month, year] = match;
  }

  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getCurrentFinancialYear() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${(year + 1).toString().slice(2)}`;
}

export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthName(monthIndex) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[monthIndex];
}

export function getMonthlyData(bills, dateKey = 'saleDate') {
  const data = new Array(12).fill(0);
  bills.forEach((bill) => {
    const d = new Date(bill[dateKey] || bill.saleDate || bill.purchaseDate);
    if (!isNaN(d.getTime())) {
      data[d.getMonth()] += parseInt(bill.totalAmount, 10) || 0;
    }
  });
  return data;
}
