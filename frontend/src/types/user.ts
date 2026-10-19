export type UserRole = 'GUARDIAN' | 'SUPPORT_WORKER' | 'INSTITUTION' | 'ADMIN';

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};
