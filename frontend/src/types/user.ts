export type UserRole = 'GUARDIAN' | 'SUPPORT_WORKER' | 'INSTITUTION';

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};
