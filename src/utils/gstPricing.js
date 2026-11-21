/* ===== GST PRICING UTILITIES =====
 * Shared constants + helpers for the backend GST pricing contract
 * (see GST-PRICING-API.md).
 *
 * The backend is the source of truth for every saved value. The split
 * helper below only produces a LIVE PREVIEW while the user is typing (before
 * anything has been saved), using the exact formulas from the API document:
 *
 *   WITHOUT_GST: base = price;               GST = base * r / 100; total = base + GST
 *   WITH_GST:    base = price / (1 + r/100); GST = price - base;   total = price
 */

export const PRICE_TYPE = {
  WITH_GST: 'WITH_GST',
  WITHOUT_GST: 'WITHOUT_GST',
};

export const PRICE_TYPE_OPTIONS = [
  { value: PRICE_TYPE.WITH_GST, label: 'With GST' },
  { value: PRICE_TYPE.WITHOUT_GST, label: 'Without GST' },
];

// Allowed `taxRate` values accepted by the backend.
export const GST_RATES = ['0', '5', '12', '18', '28'];

// Used only when a legacy product has no price mode saved yet. WITHOUT_GST
// matches how the app treated prices before the GST modes existed.
export const DEFAULT_PRICE_TYPE = PRICE_TYPE.WITHOUT_GST;

export const round2 = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function normalizePriceType(value, fallback = DEFAULT_PRICE_TYPE) {
  return value === PRICE_TYPE.WITH_GST || value === PRICE_TYPE.WITHOUT_GST
    ? value
    : fallback;
}

export function priceTypeLabel(value) {
  return value === PRICE_TYPE.WITH_GST ? 'With GST' : 'Without GST';
}

// Returns a finite, non-negative number, or null when blank / invalid.
export function readAmount(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/**
 * Preview split of an entered price into taxable base / GST / total.
 * Returns null while the price or GST rate is not usable yet.
 */
export function splitGstPrice(price, priceType, taxRate) {
  const entered = readAmount(price);
  const rate = readAmount(taxRate);
  if (entered === null || rate === null) return null;

  if (normalizePriceType(priceType) === PRICE_TYPE.WITH_GST) {
    const base = round2(entered / (1 + rate / 100));
    return { base, gst: round2(entered - base), total: round2(entered) };
  }
  const base = round2(entered);
  const gst = round2((base * rate) / 100);
  return { base, gst, total: round2(base + gst) };
}

/**
 * Saved price + mode for one side of a product.
 *   side 'sales'    -> salesPrice / sellingPrice + sellingPriceType
 *   side 'purchase' -> purchasePrice + purchasePriceType
 */
export function getProductPricing(product, side) {
  if (!product) return { price: 0, priceType: DEFAULT_PRICE_TYPE };
  if (side === 'purchase') {
    return {
      price: Number(product.purchasePrice) || 0,
      priceType: normalizePriceType(product.purchasePriceType),
    };
  }
  return {
    price: Number(product.sellingPrice ?? product.salesPrice) || 0,
    priceType: normalizePriceType(product.sellingPriceType),
  };
}

export function getDiscountedSalesPrice(product) {
  const { price } = getProductPricing(product, 'sales');
  const discount = Number(product?.discount);
  const discountPercent = Number.isFinite(discount)
    ? Math.min(Math.max(discount, 0), 100)
    : 0;
  return round2(price * (1 - discountPercent / 100));
}

export function findProduct(products, productId) {
  if (!Array.isArray(products) || productId === undefined || productId === '') {
    return null;
  }
  return (
    products.find((p) => String(p.id || p._id) === String(productId)) || null
  );
}

/**
 * Pricing fields for one bill line in a sales / purchase request.
 * The backend reads price, price mode and GST rate from the product, so
 * `price` / `priceType` are only included when the line differs from the
 * product's saved values (a one-off override).
 */
export function buildItemPriceOverrides(item, product, side) {
  const overrides = {};
  const saved = getProductPricing(product, side);

  if (!product || Number(item.price) !== saved.price) {
    overrides.price = Number(item.price) || 0;
  }
  if (item.priceType && item.priceType !== saved.priceType) {
    overrides.priceType = item.priceType;
    // A mode override is interpreted together with the price the user sees.
    overrides.price = Number(item.price) || 0;
  }
  return overrides;
}
