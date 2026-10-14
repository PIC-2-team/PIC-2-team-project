import type { ConsentRequest, LoginResponse, LoginRequest } from '../types/auth';
import { apiRequest } from './client';

export function submitConsent(body: ConsentRequest): Promise<null> {
  return apiRequest('/api/auth/consent', { method: 'POST', body });
}

export function login(body: LoginRequest): Promise<LoginResponse> {
  return apiRequest('/api/auth/login', { method: 'POST', body });
}

export function logout(): Promise<null> {
  return apiRequest('/api/auth/logout', { method: 'POST' });
}
