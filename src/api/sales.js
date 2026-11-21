import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchSaleBillsAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/sales/get-sales`,
      getAuthHeaders()
    );
    return response.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

// Full invoice with the backend-calculated item values (baseRate, taxAmount, netRate)
export async function fetchSaleBillByIdAPI(id) {
  try {
    const response = await axios.get(
      `${BASE_URL}/sales/get-sales/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function fetchSaleBillsByDateAPI(id, date) {
  try {
    const response = await axios.get(`${BASE_URL}/sales/get-sales-date`, {
      params: {
        filter: id,
        startDate: date.startDate,
        endDate: date.endDate,
      },
      ...getAuthHeaders(),
    });
    return response.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function addSaleBillAPI(bill) {
  try {
    const auth = getAuthHeaders();
    const response = await axios.post(
      `${BASE_URL}/sales/add-sales`,
      bill,
      {
        ...auth,
        ...(bill?.posIdempotencyKey && {
          headers: {
            ...auth.headers,
            'Idempotency-Key': bill.posIdempotencyKey,
          },
        }),
      }
    );
    return response.data;
  } catch (err) {
    console.error('Failed to add sales bill:', err);
    throw new Error(err.response?.data?.message || 'Failed to save bill');
  }
}

export async function returnSaleItemAPI(saleId, returnRequest, idempotencyKey) {
  try {
    const response = await axios.post(
      `${BASE_URL}/sales/return-sales/${saleId}`,
      returnRequest,
      {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    return response.data;
  } catch (err) {
    console.error('Failed to return sale item:', err);
    throw new Error(err.response?.data?.message || 'Failed to record inventory return');
  }
}

export async function fetchReturnableSaleByInvoiceNumberAPI(invoiceNumber) {
  try {
    const response = await axios.get(
      `${BASE_URL}/sales/returnable-invoice/${encodeURIComponent(invoiceNumber)}`,
      getAuthHeaders()
    );
    return response.data?.data ?? response.data;
  } catch (err) {
    console.error('Failed to find B2C invoice for return:', err);
    throw new Error(err.response?.data?.message || 'Failed to find B2C invoice');
  }
}

export async function fetchSalesReturnCreditAPI(code) {
  try {
    const response = await axios.get(
      `${BASE_URL}/sales/return-credits/${encodeURIComponent(code)}`,
      getAuthHeaders()
    );
    return response.data?.data ?? response.data;
  } catch (err) {
    console.error('Failed to validate return credit:', err);
    throw new Error(err.response?.data?.message || 'Failed to validate return credit');
  }
}

export async function createSalesReturnCreditAPI(saleId, payload, idempotencyKey) {
  try {
    const response = await axios.post(
      `${BASE_URL}/sales/return-credits/${saleId}`,
      payload,
      {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    return response.data?.data ?? response.data;
  } catch (err) {
    console.error('Failed to create B2C sales return:', err);
    throw new Error(err.response?.data?.message || 'Failed to create sales return');
  }
}

export async function updateSaleBillAPI(id, bill) {
  try {
    const response = await axios.put(
      `${BASE_URL}/sales/updatebyid-sales/${id}`,
      bill,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error('Failed to update sales bill:', err);
    throw new Error(err.response?.data?.message || 'Failed to update bill');
  }
}

export async function updatePaymentInAPI(bill) {
  try {
    const response = await axios.post(
      `${BASE_URL}/sales/updatepaymentin-sales/${bill.id}`,
      bill,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function deleteSaleBillAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/sales/delete-sales/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || 'Failed to cancel sales invoice',
    );
  }
}

// Read-only — fetches what the next invoice number would be without reserving it,
// so the Settings "Live Preview" always reflects the real running counter.
export async function previewNextInvoiceNumberAPI(companyId) {
  const response = await axios.get(`${BASE_URL}/sales/preview-next-number`, {
    params: { companyId },
    ...getAuthHeaders(),
  });
  return response.data;
}
