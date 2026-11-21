/* ===== REPORT REGISTRY — the 19 backend reports =====
 *
 * Source of truth: routes/reportsRoutes.js + mysql-controllers/reportsController.js.
 * Filter state keys ARE the backend query-param names, so what the user picks is
 * sent as-is (no renaming layer to drift out of sync).
 *
 *   fetch        → function in src/api/reports.js
 *   filters      → which filter controls the report shows (see ReportFilters.js)
 *   sortable cols→ `sort:` must equal a key in that controller's sort map
 *   summary      → keys of response.summary rendered as cards
 */
import {
  fetchSalesReportAPI,
  fetchUserReportAPI,
  fetchSalesByPartyAPI,
  fetchSalesByUserAPI,
  fetchSalesByItemAPI,
  fetchItemSalesByUserAPI,
  fetchItemSalesByPartyAPI,
  fetchPurchaseReportAPI,
  fetchPurchaseByPartyAPI,
  fetchPurchaseByItemAPI,
  fetchStockReportAPI,
  fetchStockSummaryAPI,
  fetchReportsGstr1API,
  fetchReportsGstr3bAPI,
  fetchGst2ReportAPI,
  fetchPartyOutstandingAPI,
  fetchCustomerStatementAPI,
  fetchCategoryReportAPI,
  fetchBrandReportAPI,
  fetchOtherReportAPI,
  fetchOtherReportDetailsAPI,
} from '../../api';
import { getQuickRange, fyLabel, fyStartYear } from '../../utils/reportDates';

// ── enums taken verbatim from the controller ────────────────────────────────
export const STATUS_OPTIONS = ['Paid', 'Unpaid', 'Partial', 'Overdue', 'Cancelled', 'All']; // '' = backend default (excl. Cancelled)
export const BILL_TYPES = ['B2B', 'B2C'];
export const STOCK_STATUSES = ['All', 'In Stock', 'Low Stock', 'Out of Stock', 'Negative Stock'];
export const TX_TYPES = ['Sales', 'Purchase', 'Both'];
export const PARTY_TYPES = ['All', 'Customer', 'Supplier', 'Both'];
export const OUTSTANDING_STATUSES = ['All', 'Outstanding', 'Partially Paid', 'Fully Paid', 'Overdue'];
export const STOCK_GROUPS = ['product', 'category', 'brand'];

// ── column helpers ──────────────────────────────────────────────────────────
const c = (key, label, type = 'text', sort) => ({ key, label, type, ...(sort ? { sort } : {}) });
const money = (key, label, sort) => c(key, label, 'currency', sort);
const num = (key, label, sort) => c(key, label, 'number', sort);
const date = (key, label, sort) => c(key, label, 'date', sort);

const withDefaults = (quick) => ({ quick, ...getQuickRange(quick) });
const sd = (sortBy, sortOrder = 'desc') => ({ sortBy, sortOrder });

// ── summary-card helpers ────────────────────────────────────────────────────
const card = (key, label, type, icon, color) => ({ key, label, type, icon, color });

const SALES_DOC_FILTERS = [
  'period', 'party', 'user', 'status', 'billType', 'paymentMode', 'invoiceNumber', 'product', 'category', 'brand',
];
const PURCHASE_DOC_FILTERS = [
  'period', 'party', 'status', 'paymentMode', 'purchaseNumber', 'product', 'category', 'brand',
];
const OTHER_REPORT_DEFAULTS = () => withDefaults('thisMonth');
const otherReport = (type, options) => ({
  ...options,
  defaults: OTHER_REPORT_DEFAULTS,
  serverExport: type,
  fetch: (filters) => fetchOtherReportAPI(type, filters),
  fetchDetails: (row) => fetchOtherReportDetailsAPI(type, options.detailId(row)),
});

const itemCols = (qtyLabel, totalKey, totalLabel, countKey, countLabel) => [
  num('totalQuantity', qtyLabel, 'totalQuantity'),
  money('taxableValue', 'Taxable Value'),
  money('taxAmount', 'Tax'),
  money('discountAmount', 'Discount'),
  money(totalKey, totalLabel, totalKey),
  ...(countKey ? [num(countKey, countLabel, countKey)] : []),
];

export const REPORTS = {
  // ═════════════════════════════ SALES ═════════════════════════════════════
  salesReport: {
    label: 'Sales Report', group: 'Sales', subtitle: 'Invoice-wise sales register with payment status',
    fetch: fetchSalesReportAPI, filters: SALES_DOC_FILTERS, defaults: () => withDefaults('thisMonth'),
    searchPlaceholder: 'Invoice no, party, customer, user, PO no…',
    defaultSort: sd('saleDate'),
    columns: [
      date('saleDate', 'Date', 'saleDate'),
      c('invoiceNumber', 'Invoice No', 'mono', 'invoiceNumber'),
      { ...c('partyName', 'Party', 'text', 'partyName'), get: (r) => r.partyName || r.customerName || '' },
      c('userName', 'User', 'text', 'userName'),
      c('billType', 'Bill Type', 'badge'),
      c('paymentModes', 'Payment Mode'),
      num('totalQuantity', 'Qty'),
      money('baseRate', 'Taxable'),
      money('tax', 'Tax'),
      money('globalDiscount', 'Discount'),
      money('totalAmount', 'Total', 'totalAmount'),
      money('amountPaid', 'Paid', 'amountPaid'),
      money('balanceDue', 'Balance', 'balanceDue'),
      c('paymentStatus', 'Status', 'status', 'paymentStatus'),
    ],
    summary: [
      card('invoiceCount', 'Invoices', 'number', '🧾', 'blue'),
      card('totalAmount', 'Total Sales', 'currency', '💰', 'green'),
      card('totalTax', 'Tax', 'currency', '🏛', 'cyan'),
      card('totalPaid', 'Received', 'currency', '✅', 'green'),
      card('totalBalanceDue', 'Balance Due', 'currency', '⚠️', 'amber'),
      card('totalQuantity', 'Items Sold', 'number', '📦', 'purple'),
    ],
    rowKey: (r) => r.id,
  },

  userReport: {
    label: 'User/Rep Report', group: 'Sales', subtitle: 'Sales performance per user / sales rep',
    fetch: fetchUserReportAPI, filters: SALES_DOC_FILTERS, defaults: () => withDefaults('thisMonth'),
    searchPlaceholder: 'User name or email…',
    defaultSort: sd('totalSales'),
    columns: [
      c('userName', 'User', 'text', 'userName'),
      c('role', 'Role'),
      num('invoiceCount', 'Invoices', 'invoiceCount'),
      money('totalSales', 'Total Sales', 'totalSales'),
      money('totalTax', 'Tax'),
      money('avgInvoiceValue', 'Avg Invoice', 'avgInvoiceValue'),
      num('itemsSold', 'Items Sold', 'itemsSold'),
      money('totalPaid', 'Received'),
      money('outstanding', 'Outstanding', 'outstanding'),
      num('partyCount', 'Parties'),
      num('b2bInvoiceCount', 'B2B'),
      num('b2cInvoiceCount', 'B2C'),
      date('lastSaleDate', 'Last Sale', 'lastSaleDate'),
    ],
    summary: [
      card('repCount', 'Users', 'number', '👥', 'blue'),
      card('invoiceCount', 'Invoices', 'number', '🧾', 'cyan'),
      card('totalSales', 'Total Sales', 'currency', '💰', 'green'),
      card('itemsSold', 'Items Sold', 'number', '📦', 'purple'),
      card('totalPaid', 'Received', 'currency', '✅', 'green'),
      card('outstanding', 'Outstanding', 'currency', '⚠️', 'amber'),
    ],
    rowKey: (r, i) => r.userId ?? `u${i}`,
  },

  salesByParty: {
    label: 'Sales by Party', group: 'Sales', subtitle: 'Total sales, receipts and outstanding per party',
    fetch: fetchSalesByPartyAPI, filters: SALES_DOC_FILTERS, defaults: () => withDefaults('thisMonth'),
    searchPlaceholder: 'Party name, GSTIN, phone, email…',
    defaultSort: sd('totalSales'),
    columns: [
      c('partyName', 'Party', 'text', 'partyName'),
      c('partyGST', 'GSTIN', 'mono'),
      num('invoiceCount', 'Invoices', 'invoiceCount'),
      money('totalSales', 'Total Sales', 'totalSales'),
      money('totalPaid', 'Received', 'totalPaid'),
      money('outstanding', 'Outstanding', 'outstanding'),
    ],
    summary: [
      card('partyCount', 'Parties', 'number', '🏢', 'blue'),
      card('invoiceCount', 'Invoices', 'number', '🧾', 'cyan'),
      card('totalSales', 'Total Sales', 'currency', '💰', 'green'),
      card('totalPaid', 'Received', 'currency', '✅', 'green'),
      card('outstanding', 'Outstanding', 'currency', '⚠️', 'amber'),
    ],
    rowKey: (r) => r.partyId,
  },

  salesByUser: {
    label: 'Sales by User', group: 'Sales', subtitle: 'Invoice count and sales value per user',
    fetch: fetchSalesByUserAPI, filters: SALES_DOC_FILTERS, defaults: () => withDefaults('thisMonth'),
    searchPlaceholder: 'User name or email…',
    defaultSort: sd('totalSales'),
    columns: [
      c('userName', 'User', 'text', 'userName'),
      num('invoiceCount', 'Invoices', 'invoiceCount'),
      money('totalSales', 'Total Sales', 'totalSales'),
    ],
    summary: [
      card('userCount', 'Users', 'number', '👥', 'blue'),
      card('invoiceCount', 'Invoices', 'number', '🧾', 'cyan'),
      card('totalSales', 'Total Sales', 'currency', '💰', 'green'),
    ],
    rowKey: (r, i) => r.userId ?? `u${i}`,
  },

  salesByItem: {
    label: 'Sales by Item', group: 'Sales', subtitle: 'Quantity and value sold per product',
    fetch: fetchSalesByItemAPI, filters: SALES_DOC_FILTERS, defaults: () => withDefaults('thisMonth'),
    searchPlaceholder: 'Product name, SKU, barcode…',
    defaultSort: sd('totalSales'),
    columns: [
      c('productName', 'Product', 'text', 'productName'),
      c('sku', 'SKU', 'mono'),
      c('categoryName', 'Category', 'text', 'categoryName'),
      c('brandName', 'Brand', 'text', 'brandName'),
      ...itemCols('Qty Sold', 'totalSales', 'Total Sales', 'invoiceCount', 'Invoices'),
    ],
    summary: [
      card('productCount', 'Products', 'number', '📦', 'blue'),
      card('totalQuantity', 'Qty Sold', 'number', '🔢', 'purple'),
      card('taxableValue', 'Taxable Value', 'currency', '📊', 'cyan'),
      card('taxAmount', 'Tax', 'currency', '🏛', 'amber'),
      card('totalSales', 'Total Sales', 'currency', '💰', 'green'),
      card('invoiceCount', 'Invoices', 'number', '🧾', 'blue'),
    ],
    rowKey: (r, i) => r.productId ?? `p${i}`,
  },

  itemSalesByUser: {
    label: 'Item Sales by User', group: 'Sales', subtitle: 'Which user sold which product',
    fetch: fetchItemSalesByUserAPI, filters: SALES_DOC_FILTERS, defaults: () => withDefaults('thisMonth'),
    searchPlaceholder: 'User, product name, SKU…',
    defaultSort: sd('userName', 'asc'),
    columns: [
      c('userName', 'User', 'text', 'userName'),
      c('productName', 'Product', 'text', 'productName'),
      ...itemCols('Qty Sold', 'totalSales', 'Total Sales'),
    ],
    summary: [
      card('userCount', 'Users', 'number', '👥', 'blue'),
      card('productCount', 'Products', 'number', '📦', 'cyan'),
      card('totalQuantity', 'Qty Sold', 'number', '🔢', 'purple'),
      card('taxableValue', 'Taxable Value', 'currency', '📊', 'cyan'),
      card('totalSales', 'Total Sales', 'currency', '💰', 'green'),
    ],
    rowKey: (r, i) => `${r.userId ?? 'x'}-${r.productId ?? i}-${i}`,
  },

  itemSalesByParty: {
    label: 'Item Sales by Party', group: 'Sales', subtitle: 'Which party bought which product',
    fetch: fetchItemSalesByPartyAPI, filters: SALES_DOC_FILTERS, defaults: () => withDefaults('thisMonth'),
    searchPlaceholder: 'Party, product name, SKU…',
    defaultSort: sd('partyName', 'asc'),
    columns: [
      c('partyName', 'Party', 'text', 'partyName'),
      c('productName', 'Product', 'text', 'productName'),
      ...itemCols('Qty Sold', 'totalSales', 'Total Sales'),
    ],
    summary: [
      card('partyCount', 'Parties', 'number', '🏢', 'blue'),
      card('productCount', 'Products', 'number', '📦', 'cyan'),
      card('totalQuantity', 'Qty Sold', 'number', '🔢', 'purple'),
      card('taxableValue', 'Taxable Value', 'currency', '📊', 'cyan'),
      card('totalSales', 'Total Sales', 'currency', '💰', 'green'),
    ],
    rowKey: (r, i) => `${r.partyId ?? 'x'}-${r.productId ?? i}-${i}`,
  },

  // ═════════════════════════════ PURCHASE ══════════════════════════════════
  purchaseReport: {
    label: 'Purchase Report', group: 'Purchase', subtitle: 'Bill-wise purchase register with payment status',
    partyLabel: 'Supplier',
    fetch: fetchPurchaseReportAPI, filters: PURCHASE_DOC_FILTERS, defaults: () => withDefaults('thisMonth'),
    searchPlaceholder: 'Bill no, supplier, PO no…',
    defaultSort: sd('purchaseDate'),
    columns: [
      date('purchaseDate', 'Date', 'purchaseDate'),
      c('invoiceNumber', 'Bill No', 'mono', 'invoiceNumber'),
      c('poNumber', 'PO No'),
      c('partyName', 'Supplier', 'text', 'partyName'),
      c('partyGST', 'GSTIN', 'mono'),
      c('paymentModes', 'Payment Mode'),
      num('totalQuantity', 'Qty'),
      money('baseRate', 'Taxable'),
      money('tax', 'Tax'),
      money('globalDiscount', 'Discount'),
      money('totalAmount', 'Total', 'totalAmount'),
      money('amountPaid', 'Paid', 'amountPaid'),
      money('balanceDue', 'Balance', 'balanceDue'),
      c('paymentStatus', 'Status', 'status', 'paymentStatus'),
    ],
    summary: [
      card('billCount', 'Bills', 'number', '🧾', 'blue'),
      card('totalAmount', 'Total Purchases', 'currency', '💸', 'amber'),
      card('totalTax', 'Input Tax', 'currency', '🏛', 'cyan'),
      card('totalPaid', 'Paid', 'currency', '✅', 'green'),
      card('totalBalanceDue', 'Balance Payable', 'currency', '⚠️', 'red'),
      card('totalQuantity', 'Items Bought', 'number', '📦', 'purple'),
    ],
    rowKey: (r) => r.id,
  },

  purchaseByParty: {
    label: 'Purchase by Party', group: 'Purchase', subtitle: 'Total purchases, payments and payables per supplier',
    partyLabel: 'Supplier',
    fetch: fetchPurchaseByPartyAPI, filters: PURCHASE_DOC_FILTERS, defaults: () => withDefaults('thisMonth'),
    searchPlaceholder: 'Supplier name, GSTIN, phone, email…',
    defaultSort: sd('totalPurchases'),
    columns: [
      c('partyName', 'Supplier', 'text', 'partyName'),
      c('partyGST', 'GSTIN', 'mono'),
      num('billCount', 'Bills', 'billCount'),
      money('totalPurchases', 'Total Purchases', 'totalPurchases'),
      money('totalPaid', 'Paid', 'totalPaid'),
      money('outstanding', 'Payable', 'outstanding'),
    ],
    summary: [
      card('partyCount', 'Suppliers', 'number', '🏭', 'blue'),
      card('billCount', 'Bills', 'number', '🧾', 'cyan'),
      card('totalPurchases', 'Total Purchases', 'currency', '💸', 'amber'),
      card('totalPaid', 'Paid', 'currency', '✅', 'green'),
      card('outstanding', 'Payable', 'currency', '⚠️', 'red'),
    ],
    rowKey: (r) => r.partyId,
  },

  purchaseByItem: {
    label: 'Purchase by Item', group: 'Purchase', subtitle: 'Quantity and value purchased per product',
    partyLabel: 'Supplier',
    fetch: fetchPurchaseByItemAPI, filters: PURCHASE_DOC_FILTERS, defaults: () => withDefaults('thisMonth'),
    searchPlaceholder: 'Product name, SKU, barcode…',
    defaultSort: sd('totalPurchases'),
    columns: [
      c('productName', 'Product', 'text', 'productName'),
      c('sku', 'SKU', 'mono'),
      c('categoryName', 'Category', 'text', 'categoryName'),
      c('brandName', 'Brand', 'text', 'brandName'),
      ...itemCols('Qty Bought', 'totalPurchases', 'Total Purchases', 'billCount', 'Bills'),
    ],
    summary: [
      card('productCount', 'Products', 'number', '📦', 'blue'),
      card('totalQuantity', 'Qty Bought', 'number', '🔢', 'purple'),
      card('taxableValue', 'Taxable Value', 'currency', '📊', 'cyan'),
      card('taxAmount', 'Tax', 'currency', '🏛', 'amber'),
      card('totalPurchases', 'Total Purchases', 'currency', '💸', 'amber'),
      card('billCount', 'Bills', 'number', '🧾', 'blue'),
    ],
    rowKey: (r, i) => r.productId ?? `p${i}`,
  },

  // ═════════════════════════════ INVENTORY ═════════════════════════════════
  stockReport: {
    label: 'Stock Report', group: 'Inventory', subtitle: 'Detailed per-product stock position and valuation',
    fetch: fetchStockReportAPI, filters: ['category', 'brand', 'product', 'stockStatus', 'asOfDate'],
    defaults: () => ({ stockStatus: 'All' }),
    searchPlaceholder: 'Product, SKU, barcode, HSN…',
    defaultSort: sd('name', 'asc'),
    columns: [
      c('name', 'Product', 'text', 'name'),
      c('sku', 'SKU', 'mono', 'sku'),
      c('hsnCode', 'HSN', 'mono'),
      c('categoryName', 'Category', 'text', 'categoryName'),
      c('brandName', 'Brand', 'text', 'brandName'),
      c('unit', 'Unit'),
      num('stockQuantity', 'Stock Qty', 'stockQuantity'),
      num('reportedResalableReturnQty', 'Resalable Returns'),
      num('reportedDamagedReturnQty', 'Damaged Returns'),
      num('reportedExpiredReturnQty', 'Expired Returns'),
      num('minStockLevel', 'Min Level'),
      money('purchasePrice', 'Cost'),
      money('salesPrice', 'Sale Price'),
      money('MRP', 'MRP'),
      money('stockValueAtCost', 'Value (Cost)', 'stockValueAtCost'),
      money('stockValueAtSale', 'Value (Sale)', 'stockValueAtSale'),
      num('totalSoldQty', 'Sold', 'totalSoldQty'),
      num('totalPurchasedQty', 'Purchased', 'totalPurchasedQty'),
      date('lastSaleDate', 'Last Sale', 'lastSaleDate'),
      date('lastPurchaseDate', 'Last Purchase'),
      c('stockStatus', 'Status', 'stock', 'stockStatus'),
    ],
    summary: [
      card('totalProducts', 'Products', 'number', '📦', 'blue'),
      card('totalQuantity', 'Total Qty', 'number', '🔢', 'purple'),
      card('reportedResalableReturnQty', 'Resalable Returns', 'number', '↩️', 'green'),
      card('reportedDamagedReturnQty', 'Damaged Returns', 'number', '⚠️', 'amber'),
      card('reportedExpiredReturnQty', 'Expired Returns', 'number', '⏳', 'red'),
      card('totalStockValueAtCost', 'Value (Cost)', 'currency', '💰', 'green'),
      card('totalStockValueAtSale', 'Value (Sale)', 'currency', '🏷️', 'cyan'),
      card('lowStockCount', 'Low Stock', 'number', '⚠️', 'amber'),
      card('outOfStockCount', 'Out of Stock', 'number', '🚫', 'red'),
      card('negativeStockCount', 'Negative Stock', 'number', '⛔', 'red'),
    ],
    note: 'Return quantities are historical totals grouped by recorded condition, not a separate on-hand or disposal balance. Stock Qty remains the saleable inventory figure.',
    rowKey: (r) => r.id,
  },

  stockSummary: {
    label: 'Stock Summary', group: 'Inventory', subtitle: 'Stock valuation by product, category or brand',
    fetch: fetchStockSummaryAPI, filters: ['groupBy', 'category', 'brand', 'product', 'stockStatus', 'asOfDate'],
    defaults: () => ({ groupBy: 'product', stockStatus: 'All' }),
    searchPlaceholder: 'Product, SKU, barcode, HSN…',
    defaultSort: (f) => sd(f.groupBy === 'category' ? 'categoryName' : f.groupBy === 'brand' ? 'brandName' : 'name', 'asc'),
    columnsFor: (f) => {
      const counts = [num('inStockCount', 'In Stock'), num('lowStockCount', 'Low'), num('outOfStockCount', 'Out'), num('negativeStockCount', 'Negative')];
      if (f.groupBy === 'category') {
        return [c('categoryName', 'Category', 'text', 'categoryName'), num('productCount', 'Products', 'productCount'),
          num('stockQuantity', 'Stock Qty', 'stockQuantity'),
          num('reportedResalableReturnQty', 'Resalable Returns'),
          num('reportedDamagedReturnQty', 'Damaged Returns'),
          num('reportedExpiredReturnQty', 'Expired Returns'),
          money('stockValueAtCost', 'Value (Cost)', 'stockValueAtCost'),
          money('stockValueAtSale', 'Value (Sale)', 'stockValueAtSale'), ...counts];
      }
      if (f.groupBy === 'brand') {
        return [c('brandName', 'Brand', 'text', 'brandName'), num('productCount', 'Products', 'productCount'),
          num('stockQuantity', 'Stock Qty', 'stockQuantity'),
          num('reportedResalableReturnQty', 'Resalable Returns'),
          num('reportedDamagedReturnQty', 'Damaged Returns'),
          num('reportedExpiredReturnQty', 'Expired Returns'),
          money('stockValueAtCost', 'Value (Cost)', 'stockValueAtCost'),
          money('stockValueAtSale', 'Value (Sale)', 'stockValueAtSale'), ...counts];
      }
      return [
        c('name', 'Product', 'text', 'name'), c('sku', 'SKU', 'mono', 'sku'),
        c('categoryName', 'Category', 'text', 'categoryName'), c('brandName', 'Brand', 'text', 'brandName'),
        num('stockQuantity', 'Stock Qty', 'stockQuantity'),
        num('reportedResalableReturnQty', 'Resalable Returns'),
        num('reportedDamagedReturnQty', 'Damaged Returns'),
        num('reportedExpiredReturnQty', 'Expired Returns'),
        money('purchasePrice', 'Cost'), money('salesPrice', 'Sale Price'),
        money('stockValueAtCost', 'Value (Cost)', 'stockValueAtCost'), money('stockValueAtSale', 'Value (Sale)', 'stockValueAtSale'),
        c('stockStatus', 'Status', 'stock', 'stockStatus'),
      ];
    },
    summary: [
      card('totalProducts', 'Products', 'number', '📦', 'blue'),
      card('totalQuantity', 'Total Qty', 'number', '🔢', 'purple'),
      card('totalStockValueAtCost', 'Value (Cost)', 'currency', '💰', 'green'),
      card('totalStockValueAtSale', 'Value (Sale)', 'currency', '🏷️', 'cyan'),
      card('inStockCount', 'In Stock', 'number', '✅', 'green'),
      card('lowStockCount', 'Low Stock', 'number', '⚠️', 'amber'),
      card('outOfStockCount', 'Out of Stock', 'number', '🚫', 'red'),
      card('reportedResalableReturnQty', 'Resalable Returns', 'number', '↩️', 'green'),
      card('reportedDamagedReturnQty', 'Damaged Returns', 'number', '⚠️', 'amber'),
      card('reportedExpiredReturnQty', 'Expired Returns', 'number', '⏳', 'red'),
    ],
    note: 'Return quantities are historical totals grouped by recorded condition, not a separate on-hand or disposal balance. Stock Qty remains the saleable inventory figure.',
    rowKey: (r, i) => r.id ?? r.categoryId ?? r.brandId ?? `g${i}`,
  },

  // ═════════════════════════════ GST ═══════════════════════════════════════
  gstr1: {
    label: 'GSTR-1 Report', group: 'GST', subtitle: 'Outward supplies — invoice × tax-rate rows',
    fetch: fetchReportsGstr1API, filters: ['gstPeriod', 'party', 'invoiceType', 'taxRate', 'gstin'],
    defaults: () => ({ financialYear: fyLabel(fyStartYear()) }),
    searchPlaceholder: 'Invoice no, party, GSTIN…',
    defaultSort: sd('invoiceDate', 'asc'),
    columns: [
      date('invoiceDate', 'Date', 'invoiceDate'),
      c('invoiceNumber', 'Invoice No', 'mono', 'invoiceNumber'),
      c('partyName', 'Party', 'text', 'partyName'),
      c('gstin', 'GSTIN', 'mono'),
      c('invoiceType', 'Type', 'badge'),
      c('taxRate', 'Tax Rate', 'percent', 'taxRate'),
      num('quantity', 'Qty'),
      money('taxableValue', 'Taxable Value', 'taxableValue'),
      money('taxAmount', 'Tax', 'taxAmount'),
      money('invoiceValue', 'Invoice Value', 'invoiceValue'),
    ],
    summary: [
      card('invoiceCount', 'Invoices', 'number', '🧾', 'blue'),
      card('taxableValue', 'Taxable Value', 'currency', '📊', 'cyan'),
      card('taxAmount', 'Output Tax', 'currency', '🏛', 'amber'),
      card('invoiceValue', 'Invoice Value', 'currency', '💰', 'green'),
    ],
    // summary.byInvoiceType / summary.byTaxRate arrays rendered as breakdown tables
    breakdowns: [
      { key: 'byInvoiceType', title: 'By Invoice Type', cols: [c('invoiceType', 'Type'), num('invoiceCount', 'Invoices'), money('taxableValue', 'Taxable'), money('taxAmount', 'Tax'), money('invoiceValue', 'Value')] },
      { key: 'byTaxRate', title: 'By Tax Rate', cols: [c('taxRate', 'Rate', 'percent'), num('invoiceCount', 'Invoices'), money('taxableValue', 'Taxable'), money('taxAmount', 'Tax'), money('invoiceValue', 'Value')] },
    ],
    rowKey: (r, i) => `${r.saleId}-${r.taxRate}-${i}`,
    note: 'Tax is reported in total — the schema stores no place of supply, so there is no CGST/SGST/IGST split.',
  },

  gstr1Template: {
    label: 'GST 1 – Sales Report (Excel Template)', group: 'GST',
    subtitle: 'Multi-sheet sales report using the supplied GST 1 workbook format',
    templateReport: 'gstr1',
  },

  gstr2Template: {
    label: 'GST 2 – Purchase Report (Excel Template)', group: 'GST',
    subtitle: 'Multi-sheet purchase report using the supplied GST 2 workbook format',
    templateReport: 'gstr2',
  },

  gstr3b: {
    label: 'GSTR-3B Report', group: 'GST', subtitle: '3.1 outward supplies vs 4 eligible ITC, by month × tax rate',
    fetch: fetchReportsGstr3bAPI, filters: ['gstPeriod', 'taxRate'],
    defaults: () => ({ financialYear: fyLabel(fyStartYear()) }),
    noSearch: true,
    defaultSort: sd('period', 'asc'),
    columns: [
      c('period', 'Period', 'mono', 'period'),
      c('section', 'Section', 'text', 'section'),
      c('taxRate', 'Tax Rate', 'percent', 'taxRate'),
      num('documentCount', 'Documents'),
      money('taxableValue', 'Taxable Value', 'taxableValue'),
      money('taxAmount', 'Tax', 'taxAmount'),
    ],
    summary: [
      card('outwardTaxableValue', 'Outward Taxable', 'currency', '📤', 'blue'),
      card('outwardTax', 'Output Tax', 'currency', '🏛', 'cyan'),
      card('itcTaxableValue', 'ITC Taxable', 'currency', '📥', 'purple'),
      card('itcTax', 'Input Tax Credit', 'currency', '✅', 'green'),
      card('netTaxPayable', 'Net Tax Payable', 'currency', '💰', 'amber'),
    ],
    rowKey: (r, i) => `${r.section}-${r.period}-${r.taxRate}-${i}`,
    note: 'Tax is reported in total — the schema stores no place of supply, so there is no CGST/SGST/IGST split.',
  },

  gst2: {
    label: 'GST-2 (Purchase Tax Summary)', group: 'GST', subtitle: 'Purchase tax summary by rate — input tax credit',
    partyLabel: 'Supplier',
    fetch: fetchGst2ReportAPI, filters: ['gstPeriod', 'party', 'taxRate', 'gstin'],
    defaults: () => ({ financialYear: fyLabel(fyStartYear()) }),
    noSearch: true,
    defaultSort: sd('taxRate', 'asc'),
    columns: [
      c('taxRate', 'Tax Rate', 'percent', 'taxRate'),
      num('billCount', 'Bills', 'billCount'),
      money('taxableValue', 'Taxable Value', 'taxableValue'),
      money('taxAmount', 'Tax', 'taxAmount'),
      money('totalValue', 'Total Value', 'totalValue'),
    ],
    summary: [
      card('billCount', 'Bills', 'number', '🧾', 'blue'),
      card('totalTaxableValue', 'Taxable Value', 'currency', '📊', 'cyan'),
      card('totalTaxAmount', 'Input Tax', 'currency', '🏛', 'amber'),
      card('totalValue', 'Total Value', 'currency', '💰', 'green'),
    ],
    rowKey: (r, i) => r.taxRate ?? `t${i}`,
  },

  // ═════════════════════════════ PARTY ═════════════════════════════════════
  partyOutstanding: {
    label: 'Party-wise Outstanding', group: 'Party', subtitle: 'Receivables / payables per party (one Party model for customers & suppliers)',
    fetch: fetchPartyOutstandingAPI,
    filters: ['period', 'party', 'partyType', 'transactionType', 'outstandingStatus', 'overdueDays', 'asOfDate'],
    defaults: () => ({ quick: 'all', fromDate: '', toDate: '', transactionType: 'Sales', outstandingStatus: 'Outstanding' }),
    searchPlaceholder: 'Party name, phone, email, GSTIN…',
    defaultSort: sd('outstanding'),
    columns: [
      c('partyName', 'Party', 'text', 'partyName'),
      c('partyType', 'Type', 'badge'),
      c('phone', 'Phone'),
      c('partyGST', 'GSTIN', 'mono'),
      num('unpaidInvoiceCount', 'Unpaid Docs', 'unpaidInvoiceCount'),
      money('totalInvoiced', 'Total Invoiced', 'totalInvoiced'),
      money('totalPaid', 'Paid', 'totalPaid'),
      money('receivable', 'Receivable', 'receivable'),
      money('payable', 'Payable', 'payable'),
      money('outstanding', 'Net Outstanding', 'outstanding'),
      date('oldestUnpaidDate', 'Oldest Unpaid'),
    ],
    summary: [
      card('partyCount', 'Parties', 'number', '🏢', 'blue'),
      card('unpaidInvoiceCount', 'Unpaid Docs', 'number', '🧾', 'cyan'),
      card('totalInvoiced', 'Total Invoiced', 'currency', '📊', 'purple'),
      card('totalPaid', 'Paid', 'currency', '✅', 'green'),
      card('totalReceivable', 'Receivable', 'currency', '📥', 'green'),
      card('totalPayable', 'Payable', 'currency', '📤', 'red'),
      card('netOutstanding', 'Net Outstanding', 'currency', '💰', 'amber'),
    ],
    rowKey: (r) => r.partyId,
  },

  customerStatement: {
    label: 'Customer Statement', group: 'Party', subtitle: 'Running-balance ledger for one party (customer, supplier or both)',
    fetch: (f) => fetchCustomerStatementAPI(f.partyId, f),
    filters: ['period', 'party', 'transactionType', 'asOfDate'],
    requires: ['partyId'],
    requiresMessage: 'Select a party above to view their statement.',
    defaults: () => ({ quick: 'all', fromDate: '', toDate: '', transactionType: 'Sales' }),
    searchPlaceholder: 'Reference, type, payment mode, status…',
    // backend only supports sortBy=date with sortOrder asc|desc
    defaultSort: sd('date', 'asc'),
    columns: [
      date('date', 'Date', 'date'),
      c('type', 'Type', 'badge'),
      c('reference', 'Reference', 'mono'),
      c('paymentMode', 'Payment Mode'),
      c('paymentStatus', 'Status', 'status'),
      money('debit', 'Debit'),
      money('credit', 'Credit'),
      money('runningBalance', 'Balance'),
    ],
    summary: [
      card('openingBalance', 'Opening Balance', 'currency', '🏁', 'blue'),
      card('totalDebit', 'Total Debit', 'currency', '📤', 'amber'),
      card('totalCredit', 'Total Credit', 'currency', '📥', 'green'),
      card('closingBalance', 'Closing Balance', 'currency', '💰', 'purple'),
    ],
    note: 'Balance > 0 → the party owes you; balance < 0 → you owe the party.',
    rowKey: (r, i) => `${r.type}-${r.id}-${i}`,
  },

  // ═════════════════════════════ CATEGORY / BRAND ══════════════════════════
  categoryReport: {
    label: 'Category Report', group: 'Category / Brand', subtitle: 'Sales, purchases and stock rolled up by product category',
    fetch: fetchCategoryReportAPI, filters: ['period', 'category', 'brand', 'product', 'transactionType', 'includeProducts', 'activeOnly'],
    defaults: () => ({ ...withDefaults('thisMonth'), transactionType: 'Both', includeProducts: true }),
    searchPlaceholder: 'Category or product name…',
    defaultSort: (f) => sd(f.transactionType === 'Purchase' ? 'purchaseAmount' : 'salesAmount'),
    columnsFor: (f) => groupedColumns('categoryName', 'Category', f),
    summary: groupedSummary('categoryCount', 'Categories'),
    expandable: true,
    rowKey: (r, i) => r.categoryId ?? `c${i}`,
  },

  brandReport: {
    label: 'Brand Report', group: 'Category / Brand', subtitle: 'Sales, purchases and stock rolled up by brand',
    fetch: fetchBrandReportAPI, filters: ['period', 'brand', 'category', 'product', 'transactionType', 'includeProducts', 'activeOnly'],
    defaults: () => ({ ...withDefaults('thisMonth'), transactionType: 'Both', includeProducts: true }),
    searchPlaceholder: 'Brand or product name…',
    defaultSort: (f) => sd(f.transactionType === 'Purchase' ? 'purchaseAmount' : 'salesAmount'),
    columnsFor: (f) => groupedColumns('brandName', 'Brand', f),
    summary: groupedSummary('brandCount', 'Brands'),
    expandable: true,
    rowKey: (r, i) => r.brandId ?? `b${i}`,
  },

  salesReturnsReport: otherReport('sales-returns', {
    label: 'Sales Return Report',
    group: 'Other Reports',
    subtitle: 'Recorded returns against B2C and B2B sales invoices',
    defaultSort: sd('returnDate'),
    dateRangeLabel: 'Return Period',
    searchPlaceholder: 'Invoice, return ref, customer, product or barcode…',
    filters: ['period', 'status', 'billType', 'invoiceNumber', 'returnNumber', 'customerName', 'customerPhone', 'productName', 'barcode', 'batchNumber', 'category', 'brand', 'reason', 'returnCondition', 'user'],
    filterLabels: {
      period: 'Return date range', status: 'Return record', user: 'Processed user',
      invoiceNumber: 'Original invoice', returnNumber: 'Return reference',
      customerName: 'Customer', customerPhone: 'Customer mobile',
      productName: 'Product', barcode: 'Barcode', batchNumber: 'Batch',
      category: 'Category', brand: 'Brand', reason: 'Reason',
      returnCondition: 'Condition', billType: 'Bill type',
    },
    filterOptions: {
      status: [{ value: 'RECORDED', label: 'Recorded returns' }, { value: 'ALL', label: 'All eligible records' }],
      returnCondition: [
        { value: 'GOOD', label: 'Good / Resalable' },
        { value: 'DAMAGED', label: 'Damaged' },
        { value: 'EXPIRED', label: 'Expired' },
      ],
    },
    note: 'Good / resalable returns are restored to saleable stock. Damaged and expired returns are excluded from saleable stock; there is no separate disposal workflow. Cancelled original sales invoices are excluded.',
    detailId: (row) => row.id,
    columns: [
      c('returnNumber', 'Return Reference', 'mono', 'returnNumber'),
      c('invoiceNumber', 'Original Invoice', 'mono', 'invoiceNumber'),
      date('returnDate', 'Return Date', 'returnDate'),
      c('customerName', 'Customer', 'text', 'customerName'),
      c('customerPhone', 'Mobile'),
      c('productName', 'Product', 'text', 'productName'),
      c('barcode', 'Barcode', 'mono'),
      c('batchNumber', 'Batch'),
      num('originalSoldQuantity', 'Original Sold Qty'),
      num('previousReturnedQuantity', 'Previously Returned'),
      money('originalSellingRate', 'Original Selling Rate'),
      num('gstRate', 'GST %'),
      num('returnedQuantity', 'Returned Qty', 'returnedQuantity'),
      c('quantityUnit', 'Unit'),
      c('returnCondition', 'Condition', 'badge'),
      c('inventoryDisposition', 'Inventory Disposition'),
      money('returnAmount', 'Return Amount', 'returnAmount'),
      money('creditAmount', 'Credit Amount'),
      c('refundStatus', 'Refund / Credit', 'badge'),
      c('processedBy', 'Processed By'),
      c('returnStatus', 'Status', 'badge'),
    ],
    summary: [
      card('totalReturns', 'Sales Returns', 'number', '↩️', 'blue'),
      card('totalReturnedQuantity', 'Returned Quantity', 'number', '📦', 'purple'),
      card('totalReturnValue', 'Return Value', 'currency', '💰', 'green'),
      card('totalReturnCreditAmount', 'Return Credit', 'currency', '🧾', 'cyan'),
      card('resalableQuantity', 'Resalable Qty', 'number', '✅', 'green'),
      card('damagedQuantity', 'Damaged Qty', 'number', '⚠️', 'amber'),
      card('expiredQuantity', 'Expired Qty', 'number', '⏳', 'red'),
    ],
    breakdowns: [{
      key: 'conditionBreakdown',
      title: 'Return quantities and value by condition',
      cols: [
        c('returnCondition', 'Condition', 'badge'),
        num('returnedQuantity', 'Returned Quantity'),
        money('returnAmount', 'Return Value'),
      ],
    }],
    rowKey: (row) => row.id,
  }),

  purchaseReturnsReport: otherReport('purchase-returns', {
    label: 'Purchase Return Report',
    group: 'Other Reports',
    subtitle: 'Supplier returns, original purchase rates and credit settlement',
    defaultSort: sd('returnDate'),
    dateRangeLabel: 'Return Period',
    searchPlaceholder: 'Return ref, invoice, supplier, product, batch or barcode…',
    filters: ['period', 'status', 'invoiceNumber', 'returnNumber', 'supplierName', 'supplierPhone', 'productName', 'barcode', 'batchNumber', 'reason', 'user'],
    filterLabels: {
      period: 'Return date range', status: 'Return status', user: 'Processed user',
      invoiceNumber: 'Original purchase', returnNumber: 'Return reference',
      supplierName: 'Supplier', supplierPhone: 'Supplier mobile',
      productName: 'Product', barcode: 'Barcode', batchNumber: 'Batch',
      reason: 'Reason',
    },
    filterOptions: {
      status: [
        { value: 'ACTIVE', label: 'Active / completed' },
        { value: 'CANCELLED', label: 'Cancelled' },
        { value: 'ALL', label: 'All statuses' },
      ],
    },
    detailId: (row) => row.purchaseReturnId,
    columns: [
      c('returnNumber', 'Return Reference', 'mono', 'returnNumber'),
      c('invoiceNumber', 'Original Purchase', 'mono', 'invoiceNumber'),
      date('returnDate', 'Return Date', 'returnDate'),
      c('supplierName', 'Supplier', 'text', 'supplierName'),
      c('supplierPhone', 'Supplier Mobile'),
      c('productName', 'Product', 'text', 'productName'),
      c('barcode', 'Barcode', 'mono'),
      c('batchNumber', 'Batch'),
      num('returnedQuantity', 'Returned Qty', 'returnedQuantity'),
      c('quantityUnit', 'Unit'),
      money('purchasePrice', 'Purchase Price'),
      money('returnValue', 'Return Value', 'returnValue'),
      c('reason', 'Reason'),
      c('refundCreditStatus', 'Refund / Credit', 'badge'),
      c('processedBy', 'Processed By'),
      c('returnStatus', 'Status', 'status'),
    ],
    summary: [
      card('totalReturns', 'Purchase Returns', 'number', '↩️', 'blue'),
      card('totalReturnedQuantity', 'Returned Quantity', 'number', '📦', 'purple'),
      card('totalReturnValue', 'Return Value', 'currency', '💰', 'green'),
      card('totalSuppliers', 'Suppliers', 'number', '🏢', 'cyan'),
      card('completedReturns', 'Completed', 'number', '✅', 'green'),
      card('cancelledReturns', 'Cancelled', 'number', '⊘', 'amber'),
    ],
    rowKey: (row) => row.id,
  }),

  expiryProductsReport: otherReport('expiry-products', {
    label: 'Expiry Products Report',
    group: 'Other Reports',
    subtitle: 'Available batch stock by actual expiry date, valued at inventory cost',
    defaultSort: sd('expiryDate', 'asc'),
    dateRangeLabel: 'Expiry Period',
    searchPlaceholder: 'Product, barcode, batch or supplier…',
    filters: ['period', 'expiryStatus', 'productName', 'barcode', 'category', 'brand', 'batchNumber', 'supplierName'],
    filterLabels: {
      period: 'Expiry date range', expiryStatus: 'Expiry status',
      productName: 'Product', barcode: 'Barcode', category: 'Category',
      brand: 'Brand', batchNumber: 'Batch', supplierName: 'Supplier',
    },
    filterOptions: {
      expiryStatus: [
        { value: 'EXPIRED', label: 'Expired' },
        { value: 'TODAY', label: 'Expiring today' },
        { value: 'WITHIN_7_DAYS', label: '1–7 days' },
        { value: 'WITHIN_30_DAYS', label: '8–30 days' },
        { value: 'WITHIN_60_DAYS', label: '31–60 days' },
        { value: 'SAFE', label: 'Beyond 60 days' },
      ],
    },
    detailId: (row) => row.batchId,
    columns: [
      c('productName', 'Product', 'text', 'productName'),
      c('barcode', 'Barcode', 'mono'),
      c('categoryName', 'Category'),
      c('brandName', 'Brand'),
      c('batchNumber', 'Batch', 'mono', 'batchNumber'),
      date('manufacturingDate', 'Manufactured'),
      date('expiryDate', 'Expiry Date', 'expiryDate'),
      num('daysRemaining', 'Days Remaining', 'daysRemaining'),
      money('mrp', 'MRP'),
      money('purchasePrice', 'Purchase Price'),
      num('availableQuantity', 'Available Qty', 'availableQuantity'),
      money('stockValue', 'Stock Value (Cost)', 'stockValue'),
      c('expiryStatus', 'Expiry Status', 'badge'),
      c('supplierName', 'Supplier'),
    ],
    summary: [
      card('expiredBatches', 'Expired Batches', 'number', '⚠️', 'danger'),
      card('expiredQuantity', 'Expired Quantity', 'number', '📦', 'amber'),
      card('expiringToday', 'Expiring Today', 'number', '📅', 'amber'),
      card('expiringWithin7Days', 'Within 7 Days', 'number', '⏳', 'amber'),
      card('expiringWithin30Days', '8–30 Days', 'number', '📆', 'blue'),
      card('expiringWithin60Days', '31–60 Days', 'number', '📅', 'cyan'),
      card('expiringStockValue', 'Upcoming Stock Value (Cost)', 'currency', '💰', 'green'),
    ],
    rowKey: (row) => row.batchId,
  }),

  redeemedLoyaltyPointsReport: otherReport('loyalty-redemptions', {
    label: 'Redeemed Loyalty Points Report',
    group: 'Other Reports',
    subtitle: 'Customer point redemptions with recorded reward values and reversals',
    defaultSort: sd('redemptionDate'),
    dateRangeLabel: 'Redemption Period',
    searchPlaceholder: 'Customer, mobile, invoice or redemption reference…',
    filters: ['period', 'status', 'customerName', 'customerPhone', 'invoiceNumber', 'referenceNumber', 'user', 'billType'],
    filterLabels: {
      period: 'Redemption date range', status: 'Redemption status', user: 'Processed user',
      customerName: 'Customer', customerPhone: 'Customer mobile',
      invoiceNumber: 'Invoice', referenceNumber: 'Redemption reference',
      billType: 'Bill type',
    },
    filterOptions: {
      status: [
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'REVERSED', label: 'Reversed' },
        { value: 'ALL', label: 'All statuses' },
      ],
    },
    note: 'Monetary value and value-per-point are shown only for CASH_DISCOUNT redemptions with a value recorded when redeemed. Other reward types are not converted using current loyalty settings.',
    detailId: (row) => row.id,
    columns: [
      c('referenceNumber', 'Redemption Reference', 'mono', 'referenceNumber'),
      date('redemptionDate', 'Redemption Date', 'redemptionDate'),
      c('customerName', 'Customer', 'text', 'customerName'),
      c('customerPhone', 'Mobile'),
      c('invoiceNumber', 'Invoice', 'mono'),
      num('pointsRedeemed', 'Points', 'pointsRedeemed'),
      c('redemptionRate', 'Value / Point', 'number'),
      money('redemptionValue', 'Redemption Value', 'redemptionValue'),
      c('processedBy', 'Processed By'),
      c('redemptionStatus', 'Status', 'status', 'redemptionStatus'),
      c('redemptionMethod', 'Method', 'badge'),
      c('rewardType', 'Reward Type', 'badge'),
    ],
    summary: [
      card('totalRedemptions', 'Redemptions', 'number', '🎁', 'blue'),
      card('totalPointsRedeemed', 'Points Redeemed', 'number', '⭐', 'purple'),
      card('totalRedemptionValue', 'Recorded Cash Value', 'currency', '💰', 'green'),
      card('uniqueCustomers', 'Customers', 'number', '👥', 'cyan'),
      card('averagePointsPerRedemption', 'Avg. Points / Redemption', 'number', '📊', 'blue'),
      card('reversedRedemptions', 'Reversed', 'number', '↩️', 'amber'),
    ],
    rowKey: (row) => row.id,
  }),
};

// Category/Brand columns; sales/purchase blocks follow transactionType (backend
// zeroes the side that is excluded, so hiding it avoids a column of zeros).
function groupedColumns(nameKey, nameLabel, f) {
  const showSales = f.transactionType !== 'Purchase';
  const showPurchase = f.transactionType !== 'Sales';
  return [
    c(nameKey, nameLabel, 'text', nameKey),
    num('productCount', 'Products', 'productCount'),
    ...(showSales ? [num('salesQty', 'Sales Qty', 'salesQty'), money('salesTaxableValue', 'Sales Taxable'), money('salesTax', 'Sales Tax'), money('salesAmount', 'Sales Amount', 'salesAmount')] : []),
    ...(showPurchase ? [num('purchaseQty', 'Purchase Qty', 'purchaseQty'), money('purchaseTaxableValue', 'Purchase Taxable'), money('purchaseTax', 'Purchase Tax'), money('purchaseAmount', 'Purchase Amount', 'purchaseAmount')] : []),
    num('currentStock', 'Current Stock', 'currentStock'),
    money('stockValueAtCost', 'Stock (Cost)', 'stockValueAtCost'),
    money('stockValueAtSale', 'Stock (Sale)', 'stockValueAtSale'),
  ];
}

function groupedSummary(countKey, countLabel) {
  return [
    card(countKey, countLabel, 'number', '🗂️', 'blue'),
    card('productCount', 'Products', 'number', '📦', 'cyan'),
    card('salesAmount', 'Sales', 'currency', '💰', 'green'),
    card('purchaseAmount', 'Purchases', 'currency', '💸', 'amber'),
    card('currentStock', 'Current Stock', 'number', '🔢', 'purple'),
    card('stockValueAtCost', 'Stock (Cost)', 'currency', '🏷️', 'blue'),
  ];
}

// Columns for the product rows shown when a Category/Brand row is expanded
// (response rows carry `products` when includeProducts=true).
export const PRODUCT_DETAIL_COLUMNS = [
  c('productName', 'Product'),
  c('sku', 'SKU', 'mono'),
  c('categoryName', 'Category'),
  c('brandName', 'Brand'),
  num('salesQty', 'Sales Qty'),
  money('salesAmount', 'Sales Amount'),
  num('purchaseQty', 'Purchase Qty'),
  money('purchaseAmount', 'Purchase Amount'),
  num('currentStock', 'Stock'),
  money('stockValueAtCost', 'Stock (Cost)'),
];

// ── helpers consumed by the hook / view ─────────────────────────────────────
export const REPORT_GROUP_ORDER = ['Sales', 'Purchase', 'Inventory', 'GST', 'Party', 'Category / Brand', 'Other Reports'];

export const getColumns = (def, filters) => (def.columnsFor ? def.columnsFor(filters) : def.columns);
export const getDefaultSort = (def, filters) => (typeof def.defaultSort === 'function' ? def.defaultSort(filters) : def.defaultSort);
export const getDefaultFilters = (def) => ({ ...def.defaults() });

// UI filter state → backend query params. Booleans are only sent when true.
export function buildFilterParams(filters) {
  const out = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (k === 'quick') return; // UI-only
    if (v === '' || v === null || v === undefined || v === false) return;
    out[k] = v === true ? 'true' : v;
  });
  return out;
}
