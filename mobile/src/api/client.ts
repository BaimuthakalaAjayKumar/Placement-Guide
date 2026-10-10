import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { getToken, clearAuthStorage } from '../utils/storage';

// Listener for 401 Unauthorized events
type UnauthorizedHandler = () => void;
let onUnauthorizedCallback: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorizedCallback = handler;
}

/**
 * Centralized Axios client configured for CampusBridge backend.
 * Base URL: https://placement-guide.onrender.com
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client-Platform': 'CampusBridge-Mobile',
  },
});

// Request Interceptor: Injects Authorization Bearer Token from SecureStore
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[API Client] Failed to attach token to request:', err);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

let isHandling401 = false;

// Response Interceptor: Handles 401 Unauthorized globally without retry loops
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string; message?: string }>) => {
    // Redact sensitive Authorization Bearer header to prevent accidental token leakage in logs
    if (error.config?.headers?.Authorization) {
      error.config.headers.Authorization = 'Bearer [REDACTED]';
    }

    const requestUrl = error.config?.url || '';
    const isLoginEndpoint = requestUrl.includes('/api/auth/login');

    if (error.response && error.response.status === 401 && !isLoginEndpoint) {
      if (!isHandling401) {
        isHandling401 = true;
        try {
          await clearAuthStorage();
          if (onUnauthorizedCallback) {
            onUnauthorizedCallback();
          }
        } finally {
          setTimeout(() => {
            isHandling401 = false;
          }, 1000);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
