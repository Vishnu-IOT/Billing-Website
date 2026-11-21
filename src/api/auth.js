import { axios, BASE_URL, getAuthHeaders } from './client';

export async function loginUsersAPI(data) {
  const response = await axios.post(`${BASE_URL}/users/login-Auth`, data, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  });
  return response.data;
}

export async function fetchCurrentUserAPI() {
  const response = await axios.get(`${BASE_URL}/users/me`, getAuthHeaders());
  return response.data;
}
