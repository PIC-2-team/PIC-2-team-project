import type { DisabilitySeverity } from './careRecipient';

export type Organization = {
  id: number;
  name: string;
  organizationCode: string;
  createdAt: string;
};

export type MemberStatus = 'ACTIVE' | 'INACTIVE';

export type OrganizationMember = {
  id: number;
  userId: number;
  name: string;
  phone?: string | null;
  publicCode: string;
  status: MemberStatus;
  joinedAt: string;
  characteristics?: string | null;
};

export type CareAssignment = {
  id: number;
  organizationId: number;
  careRecipientId: number;
  supportWorkerId: number;
  startDate: string;
  endDate: string | null;
  endedAt: string | null;
  createdAt: string;
};

export type LinkRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type LinkRequest = {
  id: number;
  organizationId: number;
  careRecipientId: number;
  careRecipientName: string | null;
  careRecipientNumber: string | null;
  requestedById: number;
  requestedByName: string | null;
  requestedByPublicCode: string | null;
  status: LinkRequestStatus;
  requestedAt: string;
  decidedAt: string | null;
};

export type OrganizationCareRecipient = {
  id: number;
  careRecipientNumber: string;
  name: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  disabilityTypes?: string[];
  disabilitySeverity?: DisabilitySeverity | null;
  otherDisabilityType?: string | null;
  hospitalName?: string | null;
  doctorName?: string | null;
  hospitalPhone?: string | null;
  supportCenterName?: string | null;
  supportCenterManagerName?: string | null;
  supportCenterPhone?: string | null;
  latestRecordAt?: string | null;
  createdAt?: string;
  guardianName?: string | null;
  guardianPhone?: string | null;
};

export type OrganizationGuardian = {
  id: number;
  guardianId: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  publicCode?: string | null;
  createdAt: string;
  careRecipients: {
    id: number;
    name: string;
    careRecipientNumber?: string | null;
    birthDate?: string | null;
  }[];
};

/** 보호자 탈퇴로 기관에 이관된 당사자에 새 보호자가 연결을 요청한 건 (기관이 승인해야 활성) */
export type GuardianClaim = {
  id: number;
  careRecipientId: number;
  careRecipientName: string | null;
  careRecipientNumber: string | null;
  guardianId: number;
  guardianName: string | null;
  guardianPublicCode: string | null;
  requestedAt: string;
  expiresAt: string;
};
