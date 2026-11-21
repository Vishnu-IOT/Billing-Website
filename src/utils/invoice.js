/* ===== INVOICE UTILITIES ===== */
import { toFloat } from './currency';
import {
  PRICE_TYPE,
  findProduct,
  getDiscountedSalesPrice,
  normalizePriceType,
  buildItemPriceOverrides,
  round2,
  splitGstPrice,
} from './gstPricing';
import { isWeightProduct, normalizeWeightQuantity } from './quantityUnits';

/**
 * Calculate the current financial year string
 */
export function financialYearHelper(dateStr, format = 'YY-YY') {
  if (format === 'none') return '';
  const date = dateStr ? new Date(dateStr) : new Date();
  const month = date.getMonth();
  const year = date.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  if (format === 'YYYY') return String(startYear);
  if (format === 'YY-YY')
    return `${String(startYear).slice(2)}-${String(endYear).slice(2)}`;
  if (format === 'YYYY-YYYY') return `${startYear}-${endYear}`;
  return String(startYear);
}

export function formatInvoicePrefix(settings, dateStr) {
  const prefix = settings?.invoicePrefix || 'INV';
  const sep = settings?.invoiceSeparator || '-';
  const yearFmt = settings?.invoiceYearFormat || 'YYYY';
  const fy = financialYearHelper(dateStr, yearFmt);
  let result = prefix;
  if (fy) result += sep + fy;
  return result + sep;
}

export function getNextInvoiceNo(bills = [], settings = {}) {
  const prefixStr = formatInvoicePrefix(settings, settings?.dateStr);
  const startNum = parseInt(settings?.invoiceStartingNumber || '1', 10);
  const paddingSize =
    String(settings?.invoiceStartingNumber || '0001').length || 4;

  if (!Array.isArray(bills) || bills.length === 0) {
    return prefixStr + String(startNum).padStart(paddingSize, '0');
  }

  const nums = bills.map((b) => {
    const inv = b?.invoiceNo || b?.invoiceNumber || b?.documentNumber;
    if (!inv || typeof inv !== 'string') return 0;
    if (!inv.startsWith(prefixStr)) return 0;
    const numPart = inv.slice(prefixStr.length);
    const match = numPart.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  });

  const maxNum = nums.length ? Math.max(...nums) : 0;
  const nextNum = Math.max(maxNum + 1, startNum);
  return prefixStr + String(nextNum).padStart(paddingSize, '0');
}

/**
 * Live row preview, used only while a line is being edited (nothing saved yet).
 * Honors the line's price mode (item.priceType):
 *   WITHOUT_GST - the entered price is the taxable base, GST is added on top
 *   WITH_GST    - the entered price already includes GST, base is extracted
 * Lines with no priceType keep the original behavior (GST added on top), which
 * is what quotations / challans / notes rely on.
 * Saved sales / purchase lines show the backend-calculated values instead
 * (see mapLineItemsFromBill) and are never re-taxed here.
 */
export function calcItemRow(item) {
  const price = toFloat(item.price);
  const enteredQty = toFloat(item.quantity) || 1;
  const qty =
    item.unitType === 'WEIGHT' && item.quantityUnit === 'GRAM'
      ? normalizeWeightQuantity(enteredQty, item.quantityUnit)
      : enteredQty;
  const discountPercent = Math.min(
    Math.max(toFloat(item.discountPercent), 0),
    100,
  );
  const taxRate = toFloat(item.taxRate);
  const priceType = normalizePriceType(item.priceType);
  const unitBase = round2(
    priceType === PRICE_TYPE.WITH_GST ? price / (1 + taxRate / 100) : price,
  );
  const baseAmount = round2(unitBase * qty);
  const discountAmount = round2((baseAmount * discountPercent) / 100);
  const afterDiscount = round2(baseAmount - discountAmount);
  const taxAmount = priceType === PRICE_TYPE.WITH_GST && discountAmount === 0
    ? round2(round2(price * qty) - afterDiscount)
    : round2((afterDiscount * taxRate) / 100);
  const total = round2(afterDiscount + taxAmount);
  const netRate = round2(total / qty);
  // Base (GST-exclusive) rate per unit and for the whole line, BEFORE discount:
  // e.g. base rate 10 x qty 10 = base amount 100
  const unitBaseRate = unitBase;
  return {
    ...item,
    discountPercent,
    unitBaseRate,
    baseAmount,
    discountAmount,
    afterDiscount,
    taxAmount,
    netRate,
    total,
  };
}

export function calcQuickSaleItemRow(item) {
  const quantity = toFloat(item.quantity);
  const price = toFloat(item.price);
  const taxRate = Number(item.quickSaleTaxRate);
  const isGstVerified =
    item.gstVerificationStatus === 'GST_VERIFIED' &&
    item.quickSaleTaxRate !== null &&
    item.quickSaleTaxRate !== undefined &&
    item.quickSaleTaxRate !== '' &&
    Number.isFinite(taxRate) &&
    taxRate >= 0;
  const split = isGstVerified
    ? splitGstPrice(price, PRICE_TYPE.WITH_GST, taxRate)
    : null;
  const total = round2((split?.total ?? price) * quantity);
  const baseAmount = isGstVerified
    ? round2(Number(split.base) * quantity)
    : 0;
  const taxAmount = isGstVerified
    ? round2(total - baseAmount)
    : 0;

  return {
    ...item,
    cartItemType: 'QUICK_SALE',
    productId: null,
    quantity,
    paidQuantity: quantity,
    freeQuantity: 0,
    totalQuantity: quantity,
    price,
    priceType: isGstVerified ? PRICE_TYPE.WITH_GST : null,
    taxRate: isGstVerified ? taxRate : null,
    unitBaseRate: isGstVerified ? Number(split.base) : 0,
    baseAmount,
    afterDiscount: baseAmount,
    discountAmount: 0,
    discountPercent: 0,
    taxAmount,
    netRate: quantity > 0 ? round2(total / quantity) : 0,
    total,
  };
}

function getPurchaseQuantity(item) {
  const quantity = toFloat(item.quantity);
  return item.unitType === 'WEIGHT' && item.quantityUnit === 'GRAM'
    ? normalizeWeightQuantity(quantity, item.quantityUnit)
    : quantity;
}

function getBackendPurchaseBase(price, quantity, taxRate) {
  const unitBase = round2(price / (1 + taxRate / 100));
  return round2(unitBase * quantity);
}

function findTaxableAmountForInclusiveTotal(total, taxRate) {
  const estimate = total / (1 + taxRate / 100);
  const centerInCents = Math.round(estimate * 100);
  const candidates = [];

  for (let distance = 0; distance <= 4; distance += 1) {
    const cents = distance === 0
      ? [centerInCents]
      : [centerInCents - distance, centerInCents + distance];
    cents.forEach((value) => {
      if (value < 0) return;
      const base = value / 100;
      const tax = round2((base * taxRate) / 100);
      if (round2(base + tax) === total) {
        candidates.push({ base, tax, distance: Math.abs(base - estimate) });
      }
    });
    if (candidates.length) break;
  }

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0] || null;
}

/**
 * Use a supplier's GST-inclusive line total as the source of truth for a
 * purchase row. The explicit discountAmount sent to the backend reconciles
 * cent rounding from its two-decimal unit-rate calculation; the percentage is
 * retained for display/reporting and is not applied a second time.
 */
export function calcPurchaseRowFromFinalAmount(item, finalAmount) {
  const amountText = String(finalAmount ?? '').trim();
  const amount = Number(amountText);
  if (!amountText || !Number.isFinite(amount) || amount < 0) {
    return {
      ...calcItemRow(item),
      purchaseCalculationMode: 'FINAL_AMOUNT',
      purchaseFinalAmount: amountText,
    };
  }

  const total = round2(amount);
  const quantity = getPurchaseQuantity(item);
  const taxRate = toFloat(item.taxRate);
  const discountPercent = Math.min(
    Math.max(toFloat(item.discountPercent), 0),
    100,
  );
  const taxable = findTaxableAmountForInclusiveTotal(total, taxRate);

  if (!taxable || quantity <= 0) {
    return {
      ...calcItemRow(item),
      purchaseCalculationMode: 'FINAL_AMOUNT',
      purchaseFinalAmount: amountText,
    };
  }

  const discountFactor = discountPercent < 100
    ? 1 - discountPercent / 100
    : 1;
  const effectiveRate = total / quantity;
  let rate = effectiveRate / discountFactor;
  let backendRate = round2(rate);
  let baseBeforeDiscount = getBackendPurchaseBase(
    backendRate,
    quantity,
    taxRate,
  );

  // The backend accepts a non-negative explicit discount amount. If rounding
  // the unit rate would otherwise leave too little taxable base, move it up by
  // the smallest backend-supported increment.
  if (baseBeforeDiscount < taxable.base) {
    const minUnitBase = Math.ceil((taxable.base / quantity) * 100) / 100;
    backendRate = Math.max(
      backendRate,
      round2(Math.ceil(minUnitBase * (1 + taxRate / 100) * 100) / 100),
    );
    rate = backendRate;
    baseBeforeDiscount = getBackendPurchaseBase(
      backendRate,
      quantity,
      taxRate,
    );
  }
  for (let attempt = 0; baseBeforeDiscount < taxable.base && attempt < 4; attempt += 1) {
    backendRate = round2(backendRate + 0.01);
    rate = backendRate;
    baseBeforeDiscount = getBackendPurchaseBase(
      backendRate,
      quantity,
      taxRate,
    );
  }
  if (baseBeforeDiscount < taxable.base) {
    throw new Error('Unable to represent the entered purchase amount at this quantity.');
  }

  const discountAmount = round2(baseBeforeDiscount - taxable.base);
  return {
    ...item,
    discountPercent,
    price: rate,
    priceType: PRICE_TYPE.WITH_GST,
    purchaseCalculationMode: 'FINAL_AMOUNT',
    purchaseFinalAmount: amountText,
    unitBaseRate: round2(baseBeforeDiscount / quantity),
    baseAmount: baseBeforeDiscount,
    discountAmount,
    afterDiscount: taxable.base,
    taxAmount: taxable.tax,
    netRate: round2(total / quantity),
    total,
  };
}

/**
 * Invoice-level discount. When a percentage is entered the amount is derived
 * from it (percent of the invoice total after item discounts, incl. GST);
 * otherwise a fixed amount is used (POS and older bills).
 */
export function resolveGlobalDiscount(items, globalDiscount = 0, globalDiscountPercent = 0) {
  const rawTotal = round2(items
    .filter((i) => i.productName && i.productName.trim())
    .reduce((s, i) => s + toFloat(i.total), 0));
  const percent = Math.min(Math.max(toFloat(globalDiscountPercent), 0), 100);
  const amount =
    percent > 0 ? round2((rawTotal * percent) / 100) : round2(globalDiscount);
  return { percent, amount, rawTotal };
}

export function calcBillTotals(
  items,
  globalDiscount = 0,
  globalDiscountPercent = 0,
  { roundToWholeRupee = true } = {},
) {
  const validItems = items.filter((i) => i.productName && i.productName.trim());
  const subtotal = round2(validItems.reduce((s, i) => s + toFloat(i.afterDiscount), 0));
  const totalTax = round2(validItems.reduce((s, i) => s + toFloat(i.taxAmount), 0));
  const baseTotal = round2(validItems.reduce((s, i) => s + toFloat(i.baseAmount), 0));
  const { amount: globalDiscountAmount, rawTotal } = resolveGlobalDiscount(
    items,
    globalDiscount,
    globalDiscountPercent,
  );
  const afterGlobalDiscount = round2(rawTotal - globalDiscountAmount);
  const grandTotal = roundToWholeRupee
    ? Math.round(afterGlobalDiscount)
    : round2(afterGlobalDiscount);
  const roundOff = round2(grandTotal - afterGlobalDiscount);
  return {
    subtotal,
    totalTax,
    baseTotal,
    rawTotal,
    globalDiscountAmount,
    afterGlobalDiscount,
    grandTotal,
    roundOff,
  };
}

export function calcPurchaseBillTotals(
  items,
  globalDiscount = 0,
  globalDiscountPercent = 0,
) {
  const percent = Math.min(Math.max(toFloat(globalDiscountPercent), 0), 100);
  if (percent === 0 || toFloat(globalDiscount) > 0) {
    return calcBillTotals(items, globalDiscount, globalDiscountPercent);
  }

  const validItems = items.filter((item) => item.productName && item.productName.trim());
  const originalSubtotal = round2(
    validItems.reduce(
      (sum, item) => sum + toFloat(item.afterDiscount),
      0,
    ),
  );
  const globalDiscountAmount = round2((originalSubtotal * percent) / 100);
  const rawTotal = round2(
    validItems.reduce((sum, item) => sum + toFloat(item.total), 0),
  );
  const baseTotal = round2(
    validItems.reduce((sum, item) => sum + toFloat(item.baseAmount), 0),
  );
  let allocatedBaseDiscount = 0;
  const adjustedItems = validItems.map((item, index) => {
    const lineBase = toFloat(item.afterDiscount);
    const baseDiscount = index === validItems.length - 1
      ? round2(globalDiscountAmount - allocatedBaseDiscount)
      : originalSubtotal > 0
        ? round2((globalDiscountAmount * lineBase) / originalSubtotal)
        : 0;
    allocatedBaseDiscount = round2(allocatedBaseDiscount + baseDiscount);
    return {
      base: round2(lineBase - baseDiscount),
      tax: round2(
        round2(lineBase - baseDiscount) * toFloat(item.taxRate) / 100,
      ),
    };
  });
  const subtotal = round2(
    adjustedItems.reduce((sum, item) => sum + item.base, 0),
  );
  const totalTax = round2(
    adjustedItems.reduce((sum, item) => sum + item.tax, 0),
  );
  const afterGlobalDiscount = subtotal + totalTax;
  const grandTotal = Math.round(afterGlobalDiscount);
  return {
    subtotal,
    totalTax,
    baseTotal,
    rawTotal,
    globalDiscountAmount,
    afterGlobalDiscount,
    grandTotal,
    roundOff: grandTotal - afterGlobalDiscount,
  };
}

export function getPromotionBatchAllocationKey(items) {
  const allocations = new Map();
  items.forEach((item) => {
      const price = Number(item.price) || 0;
      const groupKey = String(item.priceGroupKey || '');
      const lineQuantity = toFloat(item.quantity);
      const quantity = item.unitType === 'WEIGHT'
        ? normalizeWeightQuantity(lineQuantity, item.quantityUnit || 'KG')
        : lineQuantity;
      const itemAllocations = Array.isArray(item.batchAllocations)
        ? item.batchAllocations
        : [{ batchId: item.productBatchId || item.batchId || '', quantity }];
      itemAllocations.forEach((allocation) => {
        const batchId = String(allocation.batchId || allocation.productBatchId || '');
        const allocatedQuantity = Array.isArray(item.batchAllocations)
          ? Number(allocation.quantity) || 0
          : quantity;
        const key = JSON.stringify([batchId, price, groupKey]);
        allocations.set(key, (allocations.get(key) || 0) + allocatedQuantity);
      });
  });

  return JSON.stringify(
      [...allocations.entries()]
        .map(([key, quantity]) => {
          const [batchId, price, priceGroupKey] = JSON.parse(key);
          return {
            batchId: batchId || null,
            price: Number(price),
            ...(priceGroupKey && { priceGroupKey }),
            quantity: Number(quantity.toFixed(6)),
          };
        })
        .sort((a, b) =>
          String(a.batchId || '').localeCompare(String(b.batchId || '')) ||
          a.price - b.price ||
          String(a.priceGroupKey || '').localeCompare(String(b.priceGroupKey || '')),
      ),
  );
}

export function applyPromotionPreviewPricing(items, previews = {}) {
  const pricedItems = [...items];
  const productGroups = new Map();

  items.forEach((item, index) => {
    if (item.itemRole === 'GIFT' || !item.productId) return;
    const key = `${item.productId}:${item.priceGroupKey || ''}`;
    const group = productGroups.get(key) || [];
    group.push({ item, index });
    productGroups.set(key, group);
  });

  productGroups.forEach((group, previewKey) => {
    const productId = String(group[0].item.productId);
    const preview = previews[previewKey] ||
      (!group[0].item.priceGroupKey ? previews[productId] : null);
    const data = preview?.data;
    const pricing = data?.pricing;
    const currentBatchAllocationKey = getPromotionBatchAllocationKey(
      group.map(({ item }) => item),
    );
    const expectedPaidQuantity = group.reduce((total, { item }) => {
      const quantity = toFloat(item.quantity);
      return total + (
        item.unitType === 'WEIGHT'
          ? normalizeWeightQuantity(quantity, item.quantityUnit || 'KG')
          : quantity
      );
    }, 0);
    const previewPaidQuantity = Number(
      data?.product?.paidQuantity ?? pricing?.paidQuantity,
    );

    if (
      !pricing ||
      (preview.batchAllocationKey !== undefined &&
        preview.batchAllocationKey !== currentBatchAllocationKey) ||
      !Number.isFinite(previewPaidQuantity) ||
      Math.abs(previewPaidQuantity - expectedPaidQuantity) > 0.0005 ||
      !Number.isFinite(Number(pricing.payableAmount))
    ) {
      return;
    }

    const sum = (field) =>
      group.reduce((total, { item }) => total + (Number(item[field]) || 0), 0);
    const weightsFor = (field, fallbackField = 'total') => {
      const values = group.map(({ item }) => Math.max(0, Number(item[field]) || 0));
      const weightTotal = values.reduce((total, value) => total + value, 0);
      return weightTotal > 0
        ? values
        : group.map(({ item }) => Math.max(0, Number(item[fallbackField]) || 0));
    };
    const distribute = (amount, weights) => {
      const weightTotal = weights.reduce((total, value) => total + value, 0);
      let allocated = 0;
      return weights.map((weight, index) => {
        const value = index === weights.length - 1
          ? round2(Number(amount) - allocated)
          : weightTotal > 0
            ? round2(Number(amount) * weight / weightTotal)
            : round2(Number(amount) / weights.length);
        allocated = round2(allocated + value);
        return value;
      });
    };

    const payableAmount = Number(pricing.payableAmount);
    const afterDiscount = Number.isFinite(Number(pricing.baseRate))
      ? Number(pricing.baseRate)
      : Math.max(0, payableAmount - (Number(pricing.taxAmount) || 0));
    const taxAmount = Number(pricing.taxAmount) || 0;
    const originalBase = sum('baseAmount');
    const discountAmount = Number.isFinite(Number(pricing.discountAmount))
      ? Number(pricing.discountAmount)
      : Math.max(0, originalBase - afterDiscount);
    const totals = distribute(payableAmount, weightsFor('total'));
    const bases = distribute(afterDiscount, weightsFor('afterDiscount'));
    const taxes = distribute(taxAmount, weightsFor('taxAmount'));
    const discounts = distribute(discountAmount, weightsFor('baseAmount'));

    group.forEach(({ item, index }, groupIndex) => {
      const enteredQuantity = Number(item.quantity) || 1;
      const quantity =
        item.unitType === 'WEIGHT' && item.quantityUnit === 'GRAM'
          ? normalizeWeightQuantity(enteredQuantity, item.quantityUnit)
          : enteredQuantity;
      const selectedBatchId = String(item.productBatchId || item.batchId || '');
      const selectedBatch = selectedBatchId
        ? data?.availableBatches?.find(
            (batch) =>
              String(batch.id || batch._id || '') === selectedBatchId,
          )
        : null;
      pricedItems[index] = {
        ...item,
        price:
          Number.isFinite(Number(pricing.unitPrice)) &&
          Number(pricing.unitPrice) > 0
            ? Number(pricing.unitPrice)
            : item.price,
        mrp:
          selectedBatch &&
          Number(selectedBatch.mrp ?? selectedBatch.MRP) > 0
            ? Number(selectedBatch.mrp ?? selectedBatch.MRP)
            : item.mrp,
        total: totals[groupIndex],
        afterDiscount: bases[groupIndex],
        taxAmount: taxes[groupIndex],
        discountAmount: discounts[groupIndex],
        netRate: totals[groupIndex] / quantity,
      };
    });
  });

  return pricedItems;
}

function recoverPurchaseRawNetRates(items, globalDiscountAmount, globalDiscountPercent) {
  const savedTotal = round2(
    items.reduce((sum, item) => sum + toFloat(item.netRate), 0),
  );
  let discount = round2(toFloat(globalDiscountAmount));
  const percent = Math.min(Math.max(toFloat(globalDiscountPercent), 0), 100);
  if (!discount && percent > 0 && percent < 100) {
    discount = round2((savedTotal * percent) / (100 - percent));
  }
  if (!discount) return items.map((item) => toFloat(item.netRate));

  const beforeDiscountTotal = round2(savedTotal + discount);
  let allocatedDiscount = 0;
  return items.map((item, index) => {
    const savedNet = round2(toFloat(item.netRate));
    if (index === items.length - 1) {
      const lineDiscount = round2(discount - allocatedDiscount);
      allocatedDiscount = round2(allocatedDiscount + lineDiscount);
      return round2(savedNet + lineDiscount);
    }

    const estimate = beforeDiscountTotal > discount
      ? savedNet / (1 - discount / beforeDiscountTotal)
      : savedNet;
    const center = Math.round(estimate * 100);
    const candidates = [];
    for (let offset = -5; offset <= 5; offset += 1) {
      const rawNet = (center + offset) / 100;
      if (rawNet < 0) continue;
      const lineDiscount = round2(
        (discount * rawNet) / beforeDiscountTotal,
      );
      if (round2(rawNet - lineDiscount) === savedNet) {
        candidates.push({ rawNet, lineDiscount, distance: Math.abs(rawNet - estimate) });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    const recovered = candidates[0] || {
      rawNet: round2(estimate),
      lineDiscount: round2((discount * round2(estimate)) / beforeDiscountTotal),
    };
    allocatedDiscount = round2(allocatedDiscount + recovered.lineDiscount);
    return recovered.rawNet;
  });
}

function recoverPurchaseRawBaseRates(items, globalDiscountAmount, globalDiscountPercent) {
  const percent = Math.min(Math.max(toFloat(globalDiscountPercent), 0), 100);
  if (percent <= 0 || percent >= 100) return null;

  const savedBaseTotal = round2(
    items.reduce((sum, item) => sum + toFloat(item.baseRate), 0),
  );
  const savedNetTotal = round2(
    items.reduce((sum, item) => sum + toFloat(item.netRate), 0),
  );
  const discount = round2(toFloat(globalDiscountAmount));
  const expectedBaseDiscount = round2(
    (savedBaseTotal * percent) / (100 - percent),
  );
  const expectedLegacyGrossDiscount = round2(
    (savedNetTotal * percent) / (100 - percent),
  );
  const tolerance = Math.max(0.02, items.length * 0.01);
  if (
    discount > 0 &&
    Math.abs(discount - expectedBaseDiscount) > tolerance &&
    Math.abs(discount - expectedLegacyGrossDiscount) <= tolerance
  ) {
    return null;
  }

  const totalDiscount = discount || expectedBaseDiscount;
  const totalRawBase = round2(savedBaseTotal + totalDiscount);
  let allocatedDiscount = 0;
  return items.map((item, index) => {
    const savedBase = round2(toFloat(item.baseRate));
    const estimate = savedBase / (1 - percent / 100);
    const center = Math.round(estimate * 100);
    const candidates = [];
    for (let offset = -5; offset <= 5; offset += 1) {
      const rawBase = (center + offset) / 100;
      if (rawBase < 0) continue;
      const lineDiscount = index === items.length - 1
        ? round2(totalDiscount - allocatedDiscount)
        : totalRawBase > 0
          ? round2((totalDiscount * rawBase) / totalRawBase)
          : 0;
      if (round2(rawBase - lineDiscount) === savedBase) {
        candidates.push({
          rawBase,
          lineDiscount,
          distance: Math.abs(rawBase - estimate),
        });
      }
    }

    candidates.sort((a, b) => a.distance - b.distance);
    const recovered = candidates[0] || {
      rawBase: round2(estimate),
      lineDiscount: index === items.length - 1
        ? round2(totalDiscount - allocatedDiscount)
        : totalRawBase > 0
          ? round2((totalDiscount * round2(estimate)) / totalRawBase)
          : 0,
    };
    allocatedDiscount = round2(allocatedDiscount + recovered.lineDiscount);
    return recovered.rawBase;
  });
}

export function mapLineItemsFromBill(
  items = [],
  {
    side,
    products = [],
    globalDiscountAmount = 0,
    globalDiscountPercent = 0,
  } = {},
) {
  if (!items.length) return Array.from({ length: 3 }, createEmptyItem);
  const purchaseRawBaseRates = side === 'purchase'
    ? recoverPurchaseRawBaseRates(
        items,
        globalDiscountAmount,
        globalDiscountPercent,
      )
    : null;
  const purchaseRawNetRates = side === 'purchase'
    ? recoverPurchaseRawNetRates(
        items,
        globalDiscountAmount,
        globalDiscountPercent,
      )
    : [];
  return items.map((item, index) => {
    const productDetails = item.Product || item.product;
    const currentProduct = findProduct(products, item.productId);
    const productPriceType = side === 'purchase'
      ? productDetails?.purchasePriceType || currentProduct?.purchasePriceType
      : productDetails?.sellingPriceType || currentProduct?.sellingPriceType;
    const priceType = item.priceType || productPriceType;
    // A saved purchase line reports `quantity` as total RECEIVED (paid + free),
    // but the editable purchase quantity is the supplier-BILLED (paid) amount.
    // Loading the received total as "paid" would bill the free units again when
    // the edited bill is saved.
    const billedQuantity =
      side === 'purchase' &&
      item.paidQuantity !== undefined &&
      item.paidQuantity !== null &&
      Number(item.freeQuantity) > 0 &&
      Number(item.paidQuantity) < Number(item.quantity)
        ? item.paidQuantity
        : item.quantity;
    const base = {
      productId: item.productId || '',
      // Sale/PurchaseItem use `productName`; DocumentItem (quotation, proforma,
      // credit/debit note, delivery challan) uses `name` instead — recognize both.
      productName: item.productName || item.name || item.Product?.name || '',
      hsnCode:
        item.hsnCode ||
        item.hsncode ||
        productDetails?.HSNCode ||
        productDetails?.hsnCode ||
        '',
      sku: item.sku || '',
      batchNumber:
        item.ProductBatch?.batchNumber ||
        item.batchNumber ||
        item.batchNo ||
        '',
      productBatchId: item.productBatchId || item.batchId || '',
      salePrice: Number(
        item.ProductBatch?.salePrice ??
          item.salePrice ??
          item.salesPrice ??
          item.Product?.sellingPrice ??
          item.Product?.salesPrice ??
          0,
      ),
      mfgDate: item.ProductBatch?.mfgDate || item.mfgDate || '',
      expiryDate: item.ProductBatch?.expiryDate || item.expiryDate || '',
      serialNumber: item.serialNumber || item.serialNo || '',
      notes: item.notes || '',
      price: item.price || 0,
      quantity: billedQuantity || 1,
      paidQuantity: item.paidQuantity ?? item.quantity ?? 1,
      freeQuantity: item.freeQuantity ?? 0,
      totalQuantity:
        item.totalQuantity ??
        (Number(item.paidQuantity ?? item.quantity ?? 1) +
          Number(item.freeQuantity ?? 0)),
      quantityUnit: item.quantityUnit || item.Product?.baseUnit || '',
      unitType:
        item.unitType ||
        item.Product?.unitType ||
        item.product?.unitType ||
        'PIECE',
      baseUnit: item.baseUnit || item.Product?.baseUnit || '',
      discountPercent: Math.min(
        Math.max(
          toFloat(item.discountPercentage || item.discountPercent || 0),
          0,
        ),
        100,
      ),
      itemRole: item.itemRole || '',
      offerName: item.offerName || item.promotionName || '',
      // Sale/PurchaseItem use `taxPercentage`; DocumentItem uses `tax` instead.
      taxRate: item.taxPercentage ?? item.tax ?? item.taxRate ?? 0,
      mrp:
        item.ProductBatch?.mrp ??
        item.mrp ??
        item.MRP ??
        item.price ??
        0,
      unit: item.unit || 'pcs',
      priceType: priceType ? normalizePriceType(priceType) : undefined,
    };
    // Sales / purchase items come back from the backend with their calculated
    // values (baseRate = taxable value after discounts, taxAmount, netRate =
    // line total incl. GST). Show those as-is - never apply GST on top again.
    const hasBackendTotals = [item.baseRate, item.taxAmount, item.netRate].every(
      (v) => v !== undefined && v !== null && v !== '' && !isNaN(Number(v)),
    );
    if (hasBackendTotals) {
      const qty = toFloat(base.quantity) || 1;
      if (side === 'purchase') {
        if (purchaseRawBaseRates) {
          const rawBase = purchaseRawBaseRates[index];
          const globalDiscountBase = rawBase - toFloat(item.baseRate);
          const lineDiscountAmount = Math.max(
            0,
            round2(toFloat(item.discountAmount) - globalDiscountBase),
          );
          const taxAmount = round2(rawBase * toFloat(base.taxRate) / 100);
          const rawNet = round2(rawBase + taxAmount);
          const baseAmount = round2(rawBase + lineDiscountAmount);
          return {
            ...base,
            baseAmount,
            unitBaseRate: round2(baseAmount / qty),
            discountAmount: lineDiscountAmount,
            afterDiscount: rawBase,
            taxAmount,
            total: rawNet,
            netRate: round2(rawNet / qty),
          };
        }
        const rawNetRate = purchaseRawNetRates[index];
        const rawTaxable = findTaxableAmountForInclusiveTotal(
          rawNetRate,
          toFloat(base.taxRate),
        );
        if (rawTaxable) {
          const globalDiscountBase = rawTaxable.base - toFloat(item.baseRate);
          const lineDiscountAmount = Math.max(
            0,
            round2(toFloat(item.discountAmount) - globalDiscountBase),
          );
          const baseAmount = round2(rawTaxable.base + lineDiscountAmount);
          return {
            ...base,
            baseAmount,
            unitBaseRate: round2(baseAmount / qty),
            discountAmount: lineDiscountAmount,
            afterDiscount: rawTaxable.base,
            taxAmount: rawTaxable.tax,
            total: rawNetRate,
            netRate: round2(rawNetRate / qty),
          };
        }
      }
      // Rebuild the pre-discount base from the backend's taxable value
      const disc = toFloat(base.discountPercent);
      const savedDiscountAmount = Math.max(0, toFloat(item.discountAmount));
      const baseAmount =
        disc > 0 && disc < 100
          ? round2(toFloat(item.baseRate) / (1 - disc / 100))
          : round2(toFloat(item.baseRate) + savedDiscountAmount);
      return {
        ...base,
        baseAmount,
        unitBaseRate: round2(baseAmount / qty),
        priceType: item.priceType
          ? normalizePriceType(item.priceType)
          : undefined,
        discountAmount: savedDiscountAmount,
        afterDiscount: toFloat(item.baseRate),
        taxAmount: toFloat(item.taxAmount),
        total: toFloat(item.netRate),
        netRate: round2(toFloat(item.netRate) / qty),
      };
    }
    // DocumentItem only stores a flat `total`, not the afterDiscount/taxAmount
    // breakdown Sale/PurchaseItem has - recompute the breakdown from
    // price/quantity/discountPercent/taxRate, which exist on every item type.
    return calcItemRow(base);
  });
}

/**
 * Request items for GST-aware sales / purchase bills.
 * Purchase lines send their entered rate and discounts; sales lines use saved
 * product pricing unless they have a one-off override.
 */
function buildBillItems(validItems, products, side) {
  return validItems.map((item) => {
    const product = findProduct(products, item.productId);
    if (side === 'purchase') {
      return {
        productId: Number(item.productId),
        quantity: Number(item.quantity) || 0,
        paidQuantity: Number(item.quantity) || 0,
        freeQuantity: Number(item.freeQuantity) || 0,
        price: Number(item.price) || 0,
        purchasePrice: Number(item.price) || 0,
        ...(item.priceType && { priceType: item.priceType }),
        discountPercentage: Number(item.discountPercent) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        mrp: Number(item.mrp ?? product?.MRP ?? product?.mrp) || 0,
        salePrice: Number(
          item.salePrice ?? getDiscountedSalesPrice(product),
        ) || 0,
        ...(item.productBatchId
          ? { productBatchId: Number(item.productBatchId) }
          : {}),
        // Optional fields are omitted when blank: an empty string is not a
        // valid date for the backend's expiryDate column.
        ...(item.batchNumber ? { batchNumber: item.batchNumber } : {}),
        ...(item.mfgDate ? { mfgDate: item.mfgDate } : {}),
        ...(item.expiryDate ? { expiryDate: item.expiryDate } : {}),
        gstPercentage: Number(item.taxRate ?? product?.taxRate) || 0,
      };
    }
    return {
      productId: Number(item.productId),
      productName: item.productName,
      hsnCode: item.hsnCode,
      sku: item.sku,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      serialNumber: item.serialNumber,
      notes: item.notes,
      quantity: item.quantity,
      ...(isWeightProduct(product) && {
        quantityUnit: item.quantityUnit || 'KG',
      }),
      discountPercentage: item.discountPercent,
      ...(side === 'sales' && item.productBatchId
        ? { batchId: Number(item.productBatchId) }
        : {}),
      ...(side === 'sales' && item.priceType
        ? { priceType: item.priceType }
        : {}),
      ...(side === 'sales' && Array.isArray(item.batchAllocations) && {
        batchAllocations: item.batchAllocations.map((allocation) => ({
          batchId: Number(allocation.batchId),
          quantity: Number(allocation.quantity),
        })),
        priceGroupKey: item.priceGroupKey,
        priceGroup: item.priceGroup,
      }),
      ...(!item.productBatchId && !item.priceGroupKey &&
        buildItemPriceOverrides(item, product, side)),
    };
  });
}

export function getNonQuickSaleReceiptItems(savedItems, cartItems) {
  const sourceItems =
    Array.isArray(savedItems) && savedItems.length > 0
      ? savedItems
      : Array.isArray(cartItems)
        ? cartItems
        : [];
  return sourceItems.filter(
    (item) =>
      item?.cartItemType !== 'QUICK_SALE' &&
      item?.itemType !== 'QUICK_SALE',
  );
}

export function buildSaleBillPayload({
  billForm,
  customerForm,
  validItems,
  partyId,
  products = [],
}) {
  const gd = resolveGlobalDiscount(
    validItems,
    billForm.globalDiscount,
    billForm.globalDiscountPercent,
  );
  const quickSaleItems = validItems
    .filter((item) => item.cartItemType === 'QUICK_SALE')
    .map((item) => ({
      name: item.productName,
      barcode: item.barcode || '',
      mrp: Number(item.mrp),
      sellingPrice: Number(item.price),
      quantity: Number(item.quantity),
    }));
  return {
    invoiceNumber: billForm.invoiceNo,
    partyId,
    name: customerForm.name || '',
    phone: customerForm.phone || '',
    userId: customerForm.userId || '',
    po_number: customerForm.poNumber || '',
    eway_bill: customerForm.ewayBill || '',
    // A percentage is sent as a percentage (the backend applies it); a fixed
    // amount is only sent when no percentage was entered.
    global_discount_percentage: gd.percent,
    global_discount_amount: gd.percent > 0 ? 0 : gd.amount,
    paymentStatus: 'Unpaid',
    saleDate: billForm.date,
    items: buildBillItems(
      validItems.filter(
        (item) => item.itemRole !== 'GIFT' && item.cartItemType !== 'QUICK_SALE',
      ),
      products,
      'sales',
    ),
    ...(quickSaleItems.length > 0 && { quickSaleItems }),
  };
}

export function buildPurchaseBillPayload({
  billForm,
  validItems,
  partyId,
  customerForm,
  products = [],
  companyId,
  userId,
  invoiceType,
  taxTypeOverride,
  placeOfSupplyStateCode,
  reverseCharge = false,
  reverseChargeAmount = 0,
  itcEligible = false,
  paymentStatus = 'Unpaid',
}) {
  const gd = resolveGlobalDiscount(
    validItems,
    billForm.globalDiscount,
    billForm.globalDiscountPercent,
  );
  return {
    partyId,
    ...(companyId !== undefined && { companyId: Number(companyId) }),
    ...(userId !== undefined && { userId: Number(userId) }),
    invoiceNumber: billForm.invoiceNo,
    invoiceType,
    ...(taxTypeOverride && { taxTypeOverride }),
    ...(placeOfSupplyStateCode && { placeOfSupplyStateCode }),
    reverseCharge: Boolean(reverseCharge),
    reverseChargeAmount: Number(reverseChargeAmount) || 0,
    itcEligible: Boolean(itcEligible),
    global_discount_percentage: gd.percent,
    global_discount_amount: gd.percent > 0 ? 0 : gd.amount,
    paymentStatus,
    purchaseDate: billForm.date,
    po_number: customerForm.poNumber || '',
    eway_bill: customerForm.ewayBill || '',
    items: buildBillItems(validItems, products, 'purchase'),
  };
}

export function buildDocumentPayload({
  billForm,
  customerForm,
  validItems,
  partyId,
  documentType,
  referenceNo = '',
}) {
  const {
    subtotal: baseRate,
    totalTax: tax,
    grandTotal: totalAmount,
    globalDiscountAmount,
  } = calcBillTotals(
    validItems,
    billForm.globalDiscount,
    billForm.globalDiscountPercent,
  );

  return {
    documentType,
    documentNumber: billForm.invoiceNo,
    partyId,
    name: customerForm.name || '',
    phone: customerForm.phone || '',
    userId: customerForm.userId || '',
    po_number: customerForm.poNumber || '',
    eway_bill: customerForm.ewayBill || '',
    transportRef: customerForm.transportRef || '',
    referenceNo: referenceNo || customerForm.referenceNo || '',
    global_discount_percentage: toFloat(billForm.globalDiscountPercent),
    global_discount_amount: globalDiscountAmount,
    baseRate,
    tax,
    totalAmount,
    documentDate: billForm.date,
    validUntil: customerForm.validUntil || '',
    items: validItems.map((item) => ({
      productId: Number(item.productId),
      productName: item.productName,
      hsnCode: item.hsnCode,
      sku: item.sku,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      serialNumber: item.serialNumber,
      notes: item.notes,
      quantity: item.quantity,
      price: item.price,
      discountPercentage: item.discountPercent,
      discountAmount: item.discountAmount,
      baseRate: item.afterDiscount,
      taxPercentage: item.taxRate,
      taxAmount: item.taxAmount,
      netRate: item.total,
    })),
  };
}

export function createEmptyItem() {
  return {
    productId: '',
    productBatchId: '',
    productName: '',
    hsnCode: '',
    sku: '',
    batchNumber: '',
    mfgDate: '',
    expiryDate: '',
    serialNumber: '',
    notes: '',
    mrp: 0,
    price: 0,
    salePrice: 0,
    priceType: undefined,
    unitBaseRate: 0,
    baseAmount: 0,
    unit: 'pcs',
    discountPercent: 0,
    discountAmount: 0,
    afterDiscount: 0,
    gstAmount: 0,
    taxRate: 0,
    quantity: 1,
    paidQuantity: 1,
    freeQuantity: 0,
    totalQuantity: 1,
    netRate: 0,
    taxAmount: 0,
    total: 0,
  };
}

export function addScannedPurchaseProduct(
  items,
  products,
  product,
  updateItemField,
) {
  const productId = String(product?.id || product?._id || '');
  if (!productId) {
    throw new Error('A product is required to add a scanned purchase item');
  }
  const calculationProducts = products.some(
    (candidate) => String(candidate.id || candidate._id) === productId,
  )
    ? products
    : [...products, product];
  const mergeIndex = items.findIndex(
    (item) =>
      String(item.productId) === productId &&
      !item.productBatchId &&
      !String(item.batchNumber || '').trim() &&
      !item.mfgDate &&
      !item.expiryDate &&
      item.purchaseCalculationMode !== 'FINAL_AMOUNT',
  );
  if (mergeIndex >= 0) {
    const quantity = Number(items[mergeIndex].quantity) || 0;
    return {
      items: updateItemField(
        items,
        calculationProducts,
        mergeIndex,
        'quantity',
        quantity + 1,
        'purchase',
      ),
      merged: true,
    };
  }

  let rows = items;
  let targetIndex = rows.findIndex(
    (item) => !item.productId && !item.productName?.trim(),
  );
  if (targetIndex < 0) {
    rows = [...rows, createEmptyItem()];
    targetIndex = rows.length - 1;
  }
  return {
    items: updateItemField(
      rows,
      calculationProducts,
      targetIndex,
      'productId',
      productId,
      'purchase',
    ),
    merged: false,
  };
}
