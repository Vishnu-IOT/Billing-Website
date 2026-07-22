import axios from 'axios';
import useAuthStore from '../store/authStore';

export const BASE_URL = process.env.REACT_APP_BASE_URL;

export function getAuthHeaders() {
  const token = useAuthStore.getState().token;
  const headers = {
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return { headers };
}

export { axios };
