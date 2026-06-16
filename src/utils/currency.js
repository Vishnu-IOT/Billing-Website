/* ===== CURRENCY UTILITIES — Single source of truth ===== */

/**
 * Format a number as Indian currency (₹)
 * @param {number|string} amount
 * @returns {string} e.g. "₹1,23,456.00"
 */
export function formatCurrency(amount) {
  return (
    '₹' +
    Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Parse a string to a safe float, defaulting to 0
 */
export function toFloat(value) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse a string to a safe integer, defaulting to 0
 */
export function toInt(value) {
  const n = parseInt(value, 10);
  return isNaN(n) ? 0 : n;
}
