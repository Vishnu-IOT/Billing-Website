import { axios, BASE_URL, getAuthHeaders } from './client';

export async function addOwnersAPI(party) {
  try {
    const response = await axios.post(
      `${BASE_URL}/owners/add-Owner`,
      party,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function fetchOwnersAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/owners/get-Owner`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function deleteOwnersAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/owners/delete-Owner/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function updateOwnersAPI(id, data) {
  try {
    const response = await axios.post(
      `${BASE_URL}/owners/update-Owner/${id}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}
