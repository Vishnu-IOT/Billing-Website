import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchCusotmersAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/customers/get-Cusotmer`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}
