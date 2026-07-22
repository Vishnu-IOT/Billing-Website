/* ===== INVENTORY API ===== */
import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchStockAdjustmentsAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/inventory/get-Adjustments`,
      getAuthHeaders()
    );
    return response.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function addStockAdjustmentAPI(adjustment) {
  try {
    const response = await axios.post(
      `${BASE_URL}/inventory/add-Adjustment`,
      adjustment,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}


