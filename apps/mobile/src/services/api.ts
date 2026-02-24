import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

let apiClient: AxiosInstance | null = null;

export async function initializeApiClient(baseURL: string) {
  const token = await AsyncStorage.getItem('auth_token');

  apiClient = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  // Interceptor para agregar token a todas las requests
  apiClient.interceptors.request.use(async (config) => {
    const currentToken = await AsyncStorage.getItem('auth_token');
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  });

  return apiClient;
}

export function getApiClient(): AxiosInstance {
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  return apiClient;
}
