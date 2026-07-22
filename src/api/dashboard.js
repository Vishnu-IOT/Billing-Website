import { axios, BASE_URL, getAuthHeaders } from './client';

export async function getDashboardAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/dashboard/get-dashboard`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}
