import { axios, BASE_URL, getAuthHeaders } from './client';

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

export async function resolveQuickSaleAPI(params) {
  try {
    const response = await axios.get(`${BASE_URL}/quick-sales/resolve`, {
      ...getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not resolve this scanned item'));
  }
}

export async function fetchQuickSaleAliasesAPI(params) {
  try {
    const response = await axios.get(`${BASE_URL}/quick-sales/aliases`, {
      ...getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not load Quick Sale aliases'));
  }
}

export async function fetchQuickSaleAliasAuditAPI(aliasId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/quick-sales/aliases/${aliasId}/audit`,
      getAuthHeaders(),
    );
    return response.data?.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not load alias audit history'));
  }
}

async function updateQuickSaleAlias(aliasId, action, payload, method = 'patch') {
  try {
    const url = `${BASE_URL}/quick-sales/aliases/${aliasId}/${action}`;
    const response = method === 'delete'
      ? await axios.delete(url, { ...getAuthHeaders(), data: payload })
      : await axios[method](url, payload, getAuthHeaders());
    return response.data?.data ?? response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not update Quick Sale alias'));
  }
}

export const verifyQuickSaleGstAPI = (aliasId, payload) =>
  updateQuickSaleAlias(aliasId, 'verify-gst', payload);

export const mapQuickSaleAliasAPI = (aliasId, productId) =>
  updateQuickSaleAlias(aliasId, 'mapping', { productId });

export const reviewQuickSaleAliasAPI = (aliasId) =>
  updateQuickSaleAlias(aliasId, 'review', {});

export const unlinkQuickSaleAliasAPI = (aliasId, reason) =>
  updateQuickSaleAlias(aliasId, 'mapping', { reason }, 'delete');

export async function fetchQuickSaleReportAPI(params) {
  try {
    const response = await axios.get(`${BASE_URL}/quick-sales/reports`, {
      ...getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not load Quick Sale report'));
  }
}
