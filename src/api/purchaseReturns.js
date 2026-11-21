import { axios, BASE_URL, getAuthHeaders } from './client';

const errorFrom = (error, fallback) =>
  new Error(error.response?.data?.message || fallback);

export async function fetchPurchaseReturnSuppliersAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/purchase-returns/suppliers`,
      getAuthHeaders()
    );
    return response.data.data || [];
  } catch (error) {
    throw errorFrom(error, 'Failed to load suppliers');
  }
}

export async function fetchEligiblePurchaseInvoicesAPI(supplierId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/purchase-returns/eligible-invoices`,
      { params: { supplierId }, ...getAuthHeaders() }
    );
    return response.data.data || [];
  } catch (error) {
    throw errorFrom(error, 'Failed to load eligible purchase invoices');
  }
}

export async function fetchSupplierCreditsAPI(supplierId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/purchase-returns/supplier-credits`,
      { params: { supplierId }, ...getAuthHeaders() }
    );
    return response.data.data || [];
  } catch (error) {
    throw errorFrom(error, 'Failed to load supplier credit');
  }
}

export async function fetchSupplierCreditInvoicesAPI(supplierId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/purchase-returns/supplier-credits/invoices`,
      { params: { supplierId }, ...getAuthHeaders() }
    );
    return response.data.data || [];
  } catch (error) {
    throw errorFrom(error, 'Failed to load payable purchase invoices');
  }
}

export async function applySupplierCreditAPI(payload) {
  try {
    const response = await axios.post(
      `${BASE_URL}/purchase-returns/supplier-credits/apply`,
      payload,
      {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Idempotency-Key': payload.idempotencyKey,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw errorFrom(error, 'Failed to apply supplier credit');
  }
}

export async function fetchPurchaseReturnItemsAPI(purchaseId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/purchase-returns/purchase/${purchaseId}/items`,
      getAuthHeaders()
    );
    return response.data.data;
  } catch (error) {
    throw errorFrom(error, 'Failed to load products from the purchase invoice');
  }
}

export async function fetchPurchaseReturnsAPI(params = {}) {
  try {
    const response = await axios.get(`${BASE_URL}/purchase-returns`, {
      params,
      ...getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw errorFrom(error, 'Failed to load purchase returns');
  }
}

export async function fetchPurchaseReturnAPI(id, forPrint = false) {
  try {
    const suffix = forPrint ? '/print' : '';
    const response = await axios.get(
      `${BASE_URL}/purchase-returns/${id}${suffix}`,
      getAuthHeaders()
    );
    return response.data.data;
  } catch (error) {
    throw errorFrom(error, 'Failed to load purchase return');
  }
}

export async function createPurchaseReturnAPI(payload) {
  try {
    const response = await axios.post(
      `${BASE_URL}/purchase-returns`,
      payload,
      {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Idempotency-Key': payload.idempotencyKey,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    throw errorFrom(error, 'Failed to save purchase return');
  }
}

export async function cancelPurchaseReturnAPI(id) {
  try {
    const response = await axios.post(
      `${BASE_URL}/purchase-returns/${id}/cancel`,
      {},
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    throw errorFrom(error, 'Failed to cancel purchase return');
  }
}
