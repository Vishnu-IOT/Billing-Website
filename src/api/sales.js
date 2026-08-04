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
    const response = await axios.post(
      `${BASE_URL}/sales/add-sales`,
      bill,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error('Failed to add sales bill:', err);
    throw new Error(err.response?.data?.message || 'Failed to save bill');
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
    alert(err);
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
    alert(err);
  }
}
