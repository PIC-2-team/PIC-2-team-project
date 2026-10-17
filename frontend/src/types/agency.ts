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
  careRecipientId: number;
  organizationId: number;
  status: LinkRequestStatus;
  createdAt: string;
};
