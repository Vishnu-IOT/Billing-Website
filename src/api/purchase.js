import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchPurchaseBillsAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/purchase/get-purchase`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function fetchPurchaseBillsByDateAPI(id, date) {
  try {
    const response = await axios.get(`${BASE_URL}/purchase/get-purchase-date`, {
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

export async function addPurchaseBillAPI(bill) {
  try {
    const response = await axios.post(
      `${BASE_URL}/purchase/add-purchase`,
      bill,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function updatePurchaseBillAPI(id, bill) {
  try {
    const response = await axios.put(
      `${BASE_URL}/purchase/updatebyid-purchase/${id}`,
      bill,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function updatePaymentOutAPI(id, bill) {
  try {
    const response = await axios.post(
      `${BASE_URL}/purchase/updatepaymentout-purchase/${id}`,
      bill,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function deletePurchaseBillAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/purchase/delete-purchase/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}
