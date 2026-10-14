// TODO: AGENCY 역할은 백엔드 enum 확정 후 활성화
export type UserRole = 'GUARDIAN' | 'CAREGIVER' | 'AGENCY';

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};
