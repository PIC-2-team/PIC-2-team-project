export type UserRole = 'GUARDIAN' | 'SUPPORT_WORKER' | 'INSTITUTION' | 'ADMIN';

export type User = {
  id: number;
  name: string;
  email: string;
  publicCode?: string;
  role: UserRole;
};


/** 보호자가 탈퇴할 때 당사자별 처리 방식 (ADR-014) */
export type WithdrawalResolution = 'SUCCESSION' | 'CHOICE' | 'DELETE_ONLY';

export type WithdrawalPreview = {
  recipients: Array<{ careRecipientId: number; name: string; resolution: WithdrawalResolution }>;
  /** 탈퇴로 종료되는 활성 배정 수 (활동지원사는 본인 배정, 기관은 소유 기관의 배정) */
  endedAssignmentCount: number;
};

export type WithdrawalDecision = { careRecipientId: number; action: 'TRANSFER' | 'DELETE' };
