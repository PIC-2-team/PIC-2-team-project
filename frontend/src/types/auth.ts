import type { User } from './user';

export type LoginRequest = { email: string; password: string };
export type LoginResponse = { accessToken: string; user: User };
export type ConsentRequest = {
  basicInfo: boolean;
  sensitiveInfo: boolean;
  caregiverShare: boolean;
  marketing: boolean;
};
