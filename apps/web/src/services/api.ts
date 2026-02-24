import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';

let apiClient: AxiosInstance;

export function initializeApiClient() {
  // In development, use proxy through Vite dev server
  // In production, use relative path
  const baseURL = import.meta.env.DEV ? 'http://localhost:3000/api' : '/api';

  apiClient = axios.create({
    baseURL,
    withCredentials: true,
  });

  // Request interceptor to add authorization header
  apiClient.interceptors.request.use((config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  // Response interceptor for token refresh
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const { refreshToken } = useAuthStore.getState();
          const baseURL = import.meta.env.DEV ? 'http://localhost:3000/api' : '/api';
          const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          useAuthStore.getState().setTokens(accessToken, newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return apiClient;
}

export function getApiClient() {
  if (!apiClient) {
    initializeApiClient();
  }
  return apiClient;
}
