/* ===== EXPENSES & ANALYTICS API ===== */
import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchExpensesAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/expenses/get-Expenses`,
      getAuthHeaders()
    );
    return response.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function addExpenseAPI(expense) {
  try {
    const response = await axios.post(
      `${BASE_URL}/expenses/add-Expense`,
      expense,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function deleteExpenseAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/expenses/delete-Expense/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function fetchAnalyticsAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/analytics/get-Summary`,
      getAuthHeaders()
    );
    return response.data || {};
  } catch (err) {
    console.error(err);
    return {};
  }
}
