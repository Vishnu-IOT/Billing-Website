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

export function todayISO() {
  return new Date().toISOString().split('T')[0];
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
