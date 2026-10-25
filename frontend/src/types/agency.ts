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
  requestedById: number;
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
  disabilityGrade?: number | null;
  otherDisabilityType?: string | null;
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
    careRecipientNumber: string;
  }[];
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
    careRecipientNumber: string;
  }[];
};
