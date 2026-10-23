import type { User } from './user';

export type LoginRequest = { email: string; password: string };
export type LoginResponse = { accessToken: string; user: User };

export type GoogleAuthResult =
  | { requiresConsent: false; accessToken: string; user: User }
  | { requiresConsent: true; googleEmail: string; googleName: string; pendingToken: string };

export type GoogleRegisterRequest = {
  pendingToken: string;
  consentTicket: string;
  role: 'GUARDIAN' | 'SUPPORT_WORKER' | 'INSTITUTION';
};
export type ConsentRequest = {
  basicInfo: boolean;
  sensitiveInfo: boolean;
  caregiverShare: boolean;
  marketing: boolean;
  termsVersion: string;
};

export type ConsentResponse = {
  consentTicket: string;
};

export type RegisterRequest = {
  consentTicket: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'GUARDIAN' | 'SUPPORT_WORKER' | 'INSTITUTION';
};

export type FindEmailRequest = {
  name: string;
  phone: string;
};

export type FindEmailResponse = {
  email: string;
};

export type ResetPasswordRequest = {
  name: string;
  phone: string;
  email: string;
  newPassword: string;
};
