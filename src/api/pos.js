import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchAssignedPosCountersAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/pos/counters/assigned`,
      getAuthHeaders()
    );
    return response.data?.data || [];
  } catch (err) {
    console.error('fetchAssignedPosCountersAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

export async function fetchPosCountersAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/pos/counters`, getAuthHeaders());
    return response.data?.data || [];
  } catch (err) {
    console.error('fetchPosCountersAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

export async function createPosCounterAPI(payload) {
  try {
    const response = await axios.post(
      `${BASE_URL}/pos/counters`,
      payload,
      getAuthHeaders()
    );
    return response.data?.data || null;
  } catch (err) {
    console.error('createPosCounterAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

export async function updatePosCounterAPI(id, payload) {
  try {
    const response = await axios.put(
      `${BASE_URL}/pos/counters/${id}`,
      payload,
      getAuthHeaders()
    );
    return response.data?.data || null;
  } catch (err) {
    console.error('updatePosCounterAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

export async function fetchCurrentShiftAPI(userId, companyId) {
  try {
    const response = await axios.get(`${BASE_URL}/pos/shifts/current`, {
      params: { userId, companyId },
      ...getAuthHeaders(),
    });
    return response.data?.data || null;
  } catch (err) {
    console.error('fetchCurrentShiftAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

// Fetch shift history/details with optional filters (userId, fromDate, toDate, status)
export async function fetchShiftDetailsAPI(params = {}) {
  try {
    const response = await axios.get(`${BASE_URL}/pos/shifts/all-shifts`, {
      params,
      ...getAuthHeaders(),
    });
    return response.data;
  } catch (err) {
    console.error('fetchShiftDetailsAPI error:', err);
    throw err.response?.data?.message || err.message;
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
