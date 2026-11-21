import { axios, BASE_URL, getAuthHeaders } from './client';

// ─────────────────────────────────────────────────────────────────────────────
// Reports API — one thin wrapper per backend route in routes/reportsRoutes.js
// (all GET, mounted under `${BASE_URL}/reports`).
//
// Every list endpoint answers with:
//   { success, data, pagination:{total,page,limit,totalPages}, summary:{…},
//     filters:{applied}, … }
// and accepts page / limit / sortBy / sortOrder / search plus the
// report-specific filters documented in mysql-controllers/reportsController.js.
// ─────────────────────────────────────────────────────────────────────────────

const isBlank = (v) => v === undefined || v === null || v === '';

// Drop empty values so "" never reaches the backend as `?partyId=`.
function cleanParams(params = {}) {
  const out = {};
  Object.entries(params).forEach(([k, v]) => {
    if (!isBlank(v)) out[k] = v;
  });
  return out;
}

async function getReport(path, params = {}) {
  const response = await axios.get(`${BASE_URL}/reports/${path}`, {
    params: cleanParams(params),
    ...getAuthHeaders(),
  });
  return response.data;
}

// ── Sales ────────────────────────────────────────────────────────────────────
export const fetchSalesReportAPI = (filters) => getReport('sales-report', filters);
export const fetchUserReportAPI = (filters) => getReport('user-report', filters);
export const fetchSalesByPartyAPI = (filters) => getReport('sales-by-party', filters);
export const fetchSalesByUserAPI = (filters) => getReport('sales-by-user', filters);
export const fetchSalesByItemAPI = (filters) => getReport('sales-by-item', filters);
export const fetchItemSalesByUserAPI = (filters) => getReport('item-sales-by-user', filters);
export const fetchItemSalesByPartyAPI = (filters) => getReport('item-sales-by-party', filters);

// ── Purchase ─────────────────────────────────────────────────────────────────
export const fetchPurchaseReportAPI = (filters) => getReport('purchase-report', filters);
export const fetchPurchaseByPartyAPI = (filters) => getReport('purchase-by-party', filters);
export const fetchPurchaseByItemAPI = (filters) => getReport('purchase-by-item', filters);

// ── Inventory ────────────────────────────────────────────────────────────────
export const fetchStockReportAPI = (filters) => getReport('stock-report', filters);
export const fetchStockSummaryAPI = (filters) => getReport('stock-summary', filters);

// ── GST ──────────────────────────────────────────────────────────────────────
// NB: api/compliance.js already exports fetchGSTR1ReportAPI / fetchGSTR3BReportAPI
// (the older /compliance/get-GSTR* endpoints), so these use distinct names.
export const fetchReportsGstr1API = (filters) => getReport('gstr1', filters);
export const fetchReportsGstr3bAPI = (filters) => getReport('gstr3b', filters);
export const fetchGst2ReportAPI = (filters) => getReport('gst2', filters);
export const fetchGstTemplatePreviewAPI = (type, filters) =>
  getReport(`gst-templates/${type}/preview`, filters);
export async function downloadGstTemplateReportAPI(type, filters) {
  const response = await axios.get(`${BASE_URL}/reports/gst-templates/${type}/export`, {
    params: cleanParams(filters),
    responseType: 'blob',
    ...getAuthHeaders(),
  });
  return response.data;
}

// ── Party ────────────────────────────────────────────────────────────────────
export const fetchPartyOutstandingAPI = (filters) => getReport('party-outstanding', filters);
export const fetchCustomerStatementAPI = (partyId, filters) =>
  getReport('customer-statement', { ...filters, partyId });

// ── Category / Brand ─────────────────────────────────────────────────────────
export const fetchCategoryReportAPI = (filters) => getReport('category-report', filters);
export const fetchBrandReportAPI = (filters) => getReport('brand-report', filters);

// ── Other Reports ───────────────────────────────────────────────────────────
export const fetchOtherReportAPI = (type, filters) => getReport(`other/${type}`, filters);
export const fetchOtherReportDetailsAPI = (type, id) => getReport(`other/${type}/${id}`);
export async function downloadOtherReportAPI(type, filters, format) {
  const response = await axios.get(`${BASE_URL}/reports/other/${type}/export`, {
    params: cleanParams({ ...filters, format }),
    responseType: 'blob',
    ...getAuthHeaders(),
  });
  return response.data;
}

// ── Export helper ────────────────────────────────────────────────────────────
// Pulls EVERY page of a report for the given filters (used by Excel / PDF /
// Print so exports contain the whole filtered dataset, not just the page on
// screen). Page count comes from the server's own `pagination`, so it stays
// correct even if the backend clamps `limit`.
export async function fetchAllReportPages(fetchPage, filters = {}, { limit = 500, maxPages = 500 } = {}) {
  const first = await fetchPage({ ...filters, page: 1, limit });
  const rows = [...(first?.data || [])];
  const totalPages = Math.min(first?.pagination?.totalPages || 1, maxPages);
  for (let page = 2; page <= totalPages; page += 1) {
    // sequential on purpose: keeps load on the DB low and row order stable
    // eslint-disable-next-line no-await-in-loop
    const next = await fetchPage({ ...filters, page, limit });
    rows.push(...(next?.data || []));
  }
  return { ...first, data: rows };
}
