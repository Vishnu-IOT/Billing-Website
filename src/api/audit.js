import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchAuditLogsAPI({ module, limit = 100 } = {}) {
  try {
    const params = { limit };
    if (module) params.module = module;
    const response = await axios.get(
      `${BASE_URL}/audit-logs/get-AuditLogs`,
      { params, ...getAuthHeaders() }
    );
    return response.data?.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}
