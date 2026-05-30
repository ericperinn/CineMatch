import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

// The CineMatch API is exposed on host port 3001 (3000 is taken by another app).
// EXPO_PUBLIC_API_URL (set in .env) wins; the fallback covers each runtime:
// Android emulator reaches the host via 10.0.2.2, iOS simulator/web via localhost.
// A physical device (Expo Go) needs your machine's LAN IP set in .env.
const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${fallbackHost}:3001`;

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
