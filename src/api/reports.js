import { axios, BASE_URL, getAuthHeaders } from './client';

async function getReport(path, params = {}) {
  const response = await axios.get(`${BASE_URL}/reports/${path}`, {
    params,
    ...getAuthHeaders(),
  });
  return response.data;
}

export const fetchSalesByPartyAPI = (filters) => getReport('sales-by-party', filters);
export const fetchSalesByUserAPI = (filters) => getReport('sales-by-user', filters);
export const fetchSalesByItemAPI = (filters) => getReport('sales-by-item', filters);
export const fetchItemSalesByUserAPI = (filters) => getReport('item-sales-by-user', filters);
export const fetchStockSummaryAPI = () => getReport('stock-summary');
export const fetchGst2ReportAPI = (filters) => getReport('gst2', filters);
export const fetchPartyOutstandingAPI = () => getReport('party-outstanding');
export const fetchCustomerStatementAPI = (partyId, filters) =>
  getReport('customer-statement', { partyId, ...filters });
export const fetchPurchaseByPartyAPI = (filters) => getReport('purchase-by-party', filters);
export const fetchPurchaseByItemAPI = (filters) => getReport('purchase-by-item', filters);
