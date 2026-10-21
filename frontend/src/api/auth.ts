import type {
  ConsentRequest,
  ConsentResponse,
  FindEmailRequest,
  FindEmailResponse,
  GoogleAuthResult,
  GoogleRegisterRequest,
  LoginResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../types/auth';
import { apiRequest } from './client';

export function submitConsent(body: ConsentRequest): Promise<ConsentResponse> {
  return apiRequest('/api/auth/consent', { method: 'POST', body });
}

export function login(body: LoginRequest): Promise<LoginResponse> {
  return apiRequest('/api/auth/login', { method: 'POST', body });
}

export function findEmail(body: FindEmailRequest): Promise<FindEmailResponse> {
  return apiRequest('/api/auth/find-email', { method: 'POST', body });
}

export function resetPassword(body: ResetPasswordRequest): Promise<null> {
  return apiRequest('/api/auth/reset-password', { method: 'POST', body });
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

export function register(body: RegisterRequest): Promise<LoginResponse> {
  return apiRequest('/api/auth/register', { method: 'POST', body });
}
