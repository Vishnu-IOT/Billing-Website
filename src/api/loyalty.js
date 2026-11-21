import { axios, BASE_URL, getAuthHeaders } from './client';

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

export async function fetchLoyaltyGiftsAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/loyalty/gifts`,
      getAuthHeaders()
    );
    return response.data?.data ?? [];
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load loyalty gifts'));
  }
}

export async function redeemLoyaltyGiftAPI(payload, idempotencyKey) {
  try {
    const auth = getAuthHeaders();
    const response = await axios.post(
      `${BASE_URL}/loyalty/redeem/gift`,
      payload,
      {
        ...auth,
        headers: {
          ...auth.headers,
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    return response.data?.data ?? response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to redeem loyalty gift'));
  }
}

export async function redeemManualLoyaltyRewardAPI(payload, idempotencyKey) {
  try {
    const auth = getAuthHeaders();
    const response = await axios.post(
      `${BASE_URL}/loyalty/redeem/manual`,
      payload,
      {
        ...auth,
        headers: {
          ...auth.headers,
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    return response.data?.data ?? response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to redeem loyalty reward'));
  }
}

export async function fetchLoyaltyTransactionsAPI(
  customerId,
  { limit = 50, offset = 0 } = {}
) {
  try {
    const response = await axios.get(
      `${BASE_URL}/loyalty/customers/${customerId}/transactions`,
      {
        params: { limit, offset },
        ...getAuthHeaders(),
      }
    );
    return response.data?.data ?? response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load loyalty history'));
  }
}
