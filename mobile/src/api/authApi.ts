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

export async function updateUserProfile(data: Partial<User>): Promise<{ success: boolean; data: User; error?: string }> {
  const response = await apiClient.put<{ success: boolean; data: User; error?: string }>('/api/auth/profile', data);
  return response.data;
}

export interface FaceChallengeResponse {
  success: boolean;
  challengeNonce: string;
  promptAction: string;
  instructions: string;
  expiresAt: string;
  error?: string;
}

export async function requestFaceChallenge(preAuthToken: string): Promise<FaceChallengeResponse> {
  const response = await apiClient.post<FaceChallengeResponse>(
    '/api/auth/face/challenge',
    { token: preAuthToken },
    { headers: { Authorization: `Bearer ${preAuthToken}` } }
  );
  return response.data;
}

export async function enrollStudentFace(data: {
  preAuthToken: string;
  consentGiven: boolean;
  probeEmbedding: number[];
  challengeNonce?: string;
  livenessEvidence?: any;
}): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/api/auth/face/enroll', data);
  return response.data;
}

export async function verifyStudentFaceLogin(data: {
  challengeToken: string;
  challengeNonce: string;
  probeEmbedding: number[];
  livenessEvidence?: any;
}): Promise<AuthResponse & { similarity?: number; isLockedOut?: boolean; lockoutUntil?: string; verified?: boolean; status?: string }> {
  const response = await apiClient.post<AuthResponse & { similarity?: number; isLockedOut?: boolean; lockoutUntil?: string; verified?: boolean; status?: string }>(
    '/api/auth/face/verify-login',
    data
  );
  return response.data;
}

export async function requestEmergencyOtp(preAuthToken: string, reason?: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await apiClient.post<{ success: boolean; message?: string; error?: string }>(
    '/api/auth/face/emergency-otp',
    { preAuthToken, reason }
  );
  return response.data;
}

export async function verifyEmergencyOtp(preAuthToken: string, otp: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    '/api/auth/face/verify-emergency-otp',
    { preAuthToken, otp }
  );
  return response.data;
}
