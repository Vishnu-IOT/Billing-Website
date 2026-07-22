import { axios, BASE_URL } from './client';

export async function loginUsersAPI(data) {
  const response = await axios.post(`${BASE_URL}/users/login-Auth`, data, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  });
  return response.data;
}
