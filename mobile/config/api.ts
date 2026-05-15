import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim();

const DEFAULT_BASE_URL =
  Platform.OS === 'android' ? 'http://192.168.1.17:3000/api/v1' : 'http://localhost:3000/api/v1';

export const BASE_URL = (ENV_BASE_URL && ENV_BASE_URL.length > 0 ? ENV_BASE_URL : DEFAULT_BASE_URL).replace(
  /\/$/,
  ''
);

const API_ROOT_URL = BASE_URL.replace(/\/api\/v1\/?$/i, '');

export const toAbsoluteApiUrl = (value: string) => {
  if (!value) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return `${API_ROOT_URL}${normalizedPath}`;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const getToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('userToken');
  } else {
    return await SecureStore.getItemAsync('userToken');
  }
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignora se não for JSON válido
    }
    throw new ApiError((errorData as any).message || `Erro do servidor: Status ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }

  return response.json();
};
