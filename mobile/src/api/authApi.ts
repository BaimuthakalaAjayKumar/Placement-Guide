import apiClient from './client';
import { AuthResponse, LoginCredentials, User } from '../types/auth';

/**
 * Authentication API Service
 * Interacts with backend /api/auth routes
 */

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const payload: {
    email: string;
    password: string;
    captchaToken?: string;
  } = {
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
    captchaToken: credentials.captchaToken,
  };

  const response = await apiClient.post<AuthResponse>('/api/auth/login', payload);
  return response.data;
}

export async function getMe(): Promise<{ success: boolean; data: User }> {
  const response = await apiClient.get<{ success: boolean; data: User }>('/api/auth/me');
  return response.data;
}

export async function logoutUser(): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/api/auth/logout');
    return response.data;
  } catch (error) {
    // Non-blocking logout attempt: even if network fails, client side will clear token
    console.warn('[authApi] Backend logout failed or unreachable, proceeding with client cleanup');
    return { success: true };
  }
}
