/* ===== INVOICE UTILITIES ===== */
import { toFloat } from './currency';

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

export function calcItemRow(item) {
  const price = toFloat(item.price);
  const qty = toFloat(item.quantity) || 1;
  const discountPercent = toFloat(item.discountPercent);
  const taxRate = toFloat(item.taxRate);
  const perUnitDiscount = (price * discountPercent) / 100;
  const perUnitAfterDiscount = price - perUnitDiscount;
  const perUnitGST = (perUnitAfterDiscount * taxRate) / 100;
  const netRate = perUnitAfterDiscount + perUnitGST;
  const discountAmount = perUnitDiscount * qty;
  const afterDiscount = perUnitAfterDiscount * qty;
  const taxAmount = perUnitGST * qty;
  const total = afterDiscount + taxAmount;
  return { ...item, discountAmount, afterDiscount, taxAmount, netRate, total };
}

export function calcBillTotals(items, globalDiscount = 0) {
  const validItems = items.filter((i) => i.productName && i.productName.trim());
  const subtotal = validItems.reduce((s, i) => s + toFloat(i.afterDiscount), 0);
  const totalTax = validItems.reduce((s, i) => s + toFloat(i.taxAmount), 0);
  const rawTotal = validItems.reduce((s, i) => s + toFloat(i.total), 0);
  const afterGlobalDiscount = rawTotal - toFloat(globalDiscount);
  const grandTotal = Math.round(afterGlobalDiscount);
  const roundOff = grandTotal - afterGlobalDiscount;
  return { subtotal, totalTax, rawTotal, afterGlobalDiscount, grandTotal, roundOff };
}

export function mapLineItemsFromBill(items = []) {
  if (!items.length) return Array.from({ length: 3 }, createEmptyItem);
  return items.map((item) => ({
    productId: item.productId || '',
    productName: item.productName || item.Product?.name || '',
    hsnCode: item.hsnCode || item.hsncode || '',
    sku: item.sku || '',
    batchNumber: item.batchNumber || item.batchNo || '',
    expiryDate: item.expiryDate || '',
    serialNumber: item.serialNumber || item.serialNo || '',
    notes: item.notes || '',
    price: item.price || 0,
    quantity: item.quantity || 1,
    discountPercent: item.discountPercentage || item.discountPercent || 0,
    taxRate: item.taxPercentage || item.taxRate || 0,
    mrp: item.price || item.mrp || 0,
    unit: item.unit || 'pcs',
    afterDiscount: item.baseRate || item.afterDiscount || 0,
    discountAmount: item.discountAmount || 0,
    taxAmount: item.taxAmount || 0,
    netRate: item.netRate || 0,
    total: item.netRate || item.total || 0,
  }));
}

export function buildSaleBillPayload({ billForm, customerForm, validItems, partyId }) {
  const {
    subtotal: baseRate,
    totalTax: tax,
    grandTotal: totalAmount,
  } = calcBillTotals(validItems, billForm.globalDiscount);

  return {
    invoiceNumber: billForm.invoiceNo,
    partyId,
    name: customerForm.name || '',
    phone: customerForm.phone || '',
    userId: customerForm.userId || '',
    po_number: customerForm.poNumber || '',
    eway_bill: customerForm.ewayBill || '',
    global_discount_percentage: 0,
    global_discount_amount: toFloat(billForm.globalDiscount),
    baseRate,
    tax,
    totalAmount,
    paymentStatus: 'Unpaid',
    saleDate: billForm.date,
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

export function buildPurchaseBillPayload({ billForm, validItems, partyId, customerForm }) {
  const {
    subtotal: baseRate,
    totalTax: tax,
    grandTotal: totalAmount,
  } = calcBillTotals(validItems, billForm.globalDiscount);

  return {
    partyId,
    invoiceNumber: billForm.invoiceNo,
    global_discount_percentage: 0,
    global_discount_amount: toFloat(billForm.globalDiscount),
    baseRate,
    tax,
    totalAmount,
    paymentStatus: 'Unpaid',
    purchaseDate: billForm.date,
    po_number: customerForm.poNumber || '',
    eway_bill: customerForm.ewayBill || '',
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
  } = calcBillTotals(validItems, billForm.globalDiscount);

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
    global_discount_percentage: 0,
    global_discount_amount: toFloat(billForm.globalDiscount),
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
    productName: '',
    hsnCode: '',
    sku: '',
    batchNumber: '',
    expiryDate: '',
    serialNumber: '',
    notes: '',
    mrp: 0,
    price: 0,
    unit: 'pcs',
    discountPercent: 0,
    discountAmount: 0,
    afterDiscount: 0,
    gstAmount: 0,
    taxRate: 0,
    quantity: 1,
    netRate: 0,
    taxAmount: 0,
    total: 0,
  };
}
