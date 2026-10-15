import type { ConsentRequest, ConsentResponse, GoogleAuthResult, GoogleRegisterRequest, LoginResponse, LoginRequest } from '../types/auth';
import { apiRequest } from './client';

export function submitConsent(body: ConsentRequest): Promise<ConsentResponse> {
  return apiRequest('/api/auth/consent', { method: 'POST', body });
}

export function login(body: LoginRequest): Promise<LoginResponse> {
  return apiRequest('/api/auth/login', { method: 'POST', body });
}

export function logout(): Promise<null> {
  return apiRequest('/api/auth/logout', { method: 'POST' });
}

export function googleLogin(idToken: string): Promise<GoogleAuthResult> {
  return apiRequest('/api/auth/google', { method: 'POST', body: { idToken } });
}

export function googleRegister(body: GoogleRegisterRequest): Promise<GoogleAuthResult> {
  return apiRequest('/api/auth/google/register', { method: 'POST', body });
}
