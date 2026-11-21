/* ===== PROFIT MARGIN UTILITIES =====
 * Mirrors the backend rules in backend/utils/productMargin.js:
 *   profitAmount = sellingPrice - purchasePrice
 *   profitMargin = (profitAmount / sellingPrice) * 100   -> null when sellingPrice is 0
 * Values are rounded to 2 decimals, same as the backend.
 */

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// Returns a finite, non-negative number, or null when the input is blank / invalid.
function readPrice(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return round2(amount);
}

/**
 * @returns {{
 *   isReady: boolean,       // both prices are valid numbers
 *   profitAmount: number|null,
 *   profitMargin: number|null,  // null when not ready OR selling price is 0
 *   isLoss: boolean,
 *   isZeroSelling: boolean,
 * }}
 */
export function calculateProfitMargin(purchasePriceValue, sellingPriceValue) {
  const purchasePrice = readPrice(purchasePriceValue);
  const sellingPrice = readPrice(sellingPriceValue);

  if (purchasePrice === null || sellingPrice === null) {
    return {
      isReady: false,
      profitAmount: null,
      profitMargin: null,
      isLoss: false,
      isZeroSelling: false,
    };
  }

  const profitAmount = round2(sellingPrice - purchasePrice);
  const isZeroSelling = sellingPrice === 0;

  return {
    isReady: true,
    profitAmount,
    profitMargin: isZeroSelling ? null : round2((profitAmount / sellingPrice) * 100),
    isLoss: profitAmount < 0,
    isZeroSelling,
  };
}

// "₹1,250.00" / "-₹250.00" / "—"
export function formatProfitAmount(amount) {
  if (amount === null || amount === undefined) return '—';
  const abs = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}₹${abs}`;
}

// "25.00%" / "-12.50%" / "N/A" (zero selling price) / "—" (not entered yet)
export function formatProfitMargin({ isReady, profitMargin, isZeroSelling }) {
  if (!isReady) return '—';
  if (isZeroSelling || profitMargin === null) return 'N/A';
  return `${profitMargin.toFixed(2)}%`;
}
