import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchCurrentShiftAPI(userId) {
  try {
    const response = await axios.get(`${BASE_URL}/pos/shifts/current`, {
      params: { userId },
      ...getAuthHeaders(),
    });
    return response.data?.data || null;
  } catch (err) {
    console.error('fetchCurrentShiftAPI error:', err);
    return null;
  }
}

export async function startShiftAPI(payload) {
  try {
    const response = await axios.post(
      `${BASE_URL}/pos/shifts/start`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error('startShiftAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

export async function endShiftAPI(payload) {
  try {
    const response = await axios.post(
      `${BASE_URL}/pos/shifts/end`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error('endShiftAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

export async function holdCartAPI(payload) {
  try {
    const response = await axios.post(
      `${BASE_URL}/pos/hold`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error('holdCartAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

export async function fetchHoldCartsAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/pos/hold`, getAuthHeaders());
    return response.data?.data || [];
  } catch (err) {
    console.error('fetchHoldCartsAPI error:', err);
    return [];
  }
}

export async function resumeHoldCartAPI(id) {
  try {
    const response = await axios.post(
      `${BASE_URL}/pos/hold/${id}/resume`,
      {},
      getAuthHeaders()
    );
    return response.data?.data || null;
  } catch (err) {
    console.error('resumeHoldCartAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

export async function cancelHoldCartAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/pos/hold/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error('cancelHoldCartAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}
