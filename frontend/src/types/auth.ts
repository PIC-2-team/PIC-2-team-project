import type { User } from './user';

export type LoginRequest = { email: string; password: string };
export type LoginResponse = { accessToken: string; user: User };

export type GoogleAuthResult =
  | { requiresConsent: false; accessToken: string; refreshToken: string; user: User }
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
