import { axios, BASE_URL, getAuthHeaders } from './client';

// Warehouses API
export async function fetchWarehousesAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/inventory/warehouses`, getAuthHeaders());
    return response.data?.data || [];
  } catch (err) {
    console.error('fetchWarehousesAPI error:', err);
    return [];
  }
}

export async function createWarehouseAPI(payload) {
  try {
    const response = await axios.post(`${BASE_URL}/inventory/warehouses`, payload, getAuthHeaders());
    return response.data;
  } catch (err) {
    console.error('createWarehouseAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

export async function updateWarehouseAPI(id, payload) {
  try {
    const response = await axios.put(`${BASE_URL}/inventory/warehouses/${id}`, payload, getAuthHeaders());
    return response.data;
  } catch (err) {
    console.error('updateWarehouseAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

export async function deleteWarehouseAPI(id) {
  try {
    const response = await axios.delete(`${BASE_URL}/inventory/warehouses/${id}`, getAuthHeaders());
    return response.data;
  } catch (err) {
    console.error('deleteWarehouseAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

// Stock Ledger & Reorder Alerts
export async function fetchStockLedgerAPI(params = {}) {
  try {
    const response = await axios.get(`${BASE_URL}/inventory/ledger`, {
      params,
      ...getAuthHeaders(),
    });
    return response.data?.data || [];
  } catch (err) {
    console.error('fetchStockLedgerAPI error:', err);
    return [];
  }
}

export async function fetchReorderAlertsAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/inventory/reorder-alerts`, getAuthHeaders());
    return response.data?.data || [];
  } catch (err) {
    console.error('fetchReorderAlertsAPI error:', err);
    return [];
  }
}

// Stock Transfers
export async function fetchStockTransfersAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/inventory/transfers`, getAuthHeaders());
    return response.data?.data || [];
  } catch (err) {
    console.error('fetchStockTransfersAPI error:', err);
    return [];
  }
}

export async function createStockTransferAPI(payload) {
  try {
    const response = await axios.post(`${BASE_URL}/inventory/transfers`, payload, getAuthHeaders());
    return response.data;
  } catch (err) {
    console.error('createStockTransferAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

export async function receiveStockTransferAPI(id) {
  try {
    const response = await axios.post(`${BASE_URL}/inventory/transfers/${id}/receive`, {}, getAuthHeaders());
    return response.data;
  } catch (err) {
    console.error('receiveStockTransferAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}
