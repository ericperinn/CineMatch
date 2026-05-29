import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

// In Expo, process.env.EXPO_PUBLIC_API_URL can be configured in .env
// We default to localhost if not set (for iOS simulator) or 10.0.2.2 for Android emulator
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add the Authorization header if we have a token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Optionally handle 401 Unauthorized responses to logout the user
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
