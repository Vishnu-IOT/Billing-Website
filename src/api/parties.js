import { axios, BASE_URL, getAuthHeaders } from './client';

export async function addPartiesAPI(party) {
  try {
    const response = await axios.post(
      `${BASE_URL}/parties/add-Party`,
      party,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function fetchPartiesAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/parties/get-Party`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function deletePartiesAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/parties/delete-Party/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function updatePartiesAPI(id, data) {
  try {
    const response = await axios.post(
      `${BASE_URL}/parties/update-Party/${id}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function fetchInvoiceByPartiesIdAPI(id) {
  try {
    const response = await axios.get(
      `${BASE_URL}/parties/invoiceById-Party/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function fetchPartyAgeingAPI(id) {
  try {
    const response = await axios.get(
      `${BASE_URL}/parties/get-Ageing/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
}
