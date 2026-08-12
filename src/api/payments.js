import axios from 'axios';
import { BASE_URL, getAuthHeaders } from './client';

/* ── Payments In ── */
export async function fetchPaymentsInAPI(
  startDate = '',
  endDate = ''
) {
  try {
    const params = {};

    if (startDate) {
      params.startDate = startDate;
    }

    if (endDate) {
      params.endDate = endDate;
    }

    const response = await axios.get(
      `${BASE_URL}/payments/in`,
      {
        ...getAuthHeaders(),
        params,
      }
    );

    return response.data;

  } catch (err) {
    console.error('Fetch Payments In Error:', err);
    throw err;
  }
}

export async function addPaymentInAPI(payment) {
  try {
    const response = await axios.post(`${BASE_URL}/payments/in`, payment, getAuthHeaders());
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function deletePaymentInAPI(id) {
  try {
    const response = await axios.delete(`${BASE_URL}/payments/in/${id}`, getAuthHeaders());
    return response.data;
  } catch (err) {
    alert(err);
  }
}

/* ── Payments Out ── */
export async function fetchPaymentsOutAPI(
  startDate = '',
  endDate = ''
) {
  try {
    const params = {};

    if (startDate) {
      params.startDate = startDate;
    }

    if (endDate) {
      params.endDate = endDate;
    }

    const response = await axios.get(
      `${BASE_URL}/payments/out`,
      {
        ...getAuthHeaders(),
        params,
      }
    );

    return response.data;

  } catch (err) {
    console.error('Fetch Payments Out Error:', err);
    throw err;
  }
}

export async function addPaymentOutAPI(payment) {
  try {
    const response = await axios.post(`${BASE_URL}/payments/out`, payment, getAuthHeaders());
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function deletePaymentOutAPI(id) {
  try {
    const response = await axios.delete(`${BASE_URL}/payments/out/${id}`, getAuthHeaders());
    return response.data;
  } catch (err) {
    alert(err);
  }
}
