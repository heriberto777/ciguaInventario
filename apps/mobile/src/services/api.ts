import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

let apiClient: AxiosInstance | null = null;
let logoutCallback: (() => void) | null = null;
let loginCallback: (() => void) | null = null;

export function onLogout(callback: () => void) {
  logoutCallback = callback;
}

export function onLogin(callback: () => void) {
  loginCallback = callback;
}

export function notifyLogin() {
  loginCallback?.();
}

export function notifyLogout() {
  logoutCallback?.();
}

export async function initializeApiClient(baseURL: string) {
  const token = await AsyncStorage.getItem('auth_token');

  // Si ya existe, solo actualizamos el baseURL y el token inicial
  if (apiClient) {
    apiClient.defaults.baseURL = baseURL;
    if (token) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
    return apiClient;
  }

  apiClient = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  // Interceptor para asegurar que el token esté siempre fresco desde AsyncStorage en cada request
  apiClient.interceptors.request.use(async (config) => {
    const currentToken = await AsyncStorage.getItem('auth_token');
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  });

  // Interceptor para manejar 401 globalmente con Refresh Token
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Si es 401 y no es un reintento de refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          console.log('🔄 Token expired, attempting refresh...');
          const refreshToken = await AsyncStorage.getItem('refresh_token');

          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // Usar la URL actual del cliente (no la del closure, que puede ser stale)
          const currentBase = apiClient?.defaults.baseURL || baseURL;
          const refreshResponse = await axios.post(`${currentBase}/auth/refresh`, {
            refreshToken
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data.data;

          // Guardar nuevos tokens
          await AsyncStorage.setItem('auth_token', newAccessToken);
          await AsyncStorage.setItem('refresh_token', newRefreshToken);

          // Actualizar request original y reintentar usando el cliente oficial
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient!(originalRequest);
        } catch (refreshError: any) {
          const status = refreshError.response?.status;
          console.error('❌ [API] Refresh token failed or expired:', {
            status,
            message: refreshError.message
          });

          // Solo desloguear si es un error de autenticación explícito (401)
          if (status === 401 && logoutCallback) {
            console.warn('🔒 [API] Session expired. Redirecting to login.');
            logoutCallback();
          }
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return apiClient;
}

export function getApiClient(): AxiosInstance {
  if (!apiClient) {
    apiClient = axios.create({
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return apiClient;
}
