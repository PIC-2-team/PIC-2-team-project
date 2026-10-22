import type { CareRecipient } from '../types/careRecipient';
import { apiRequest } from './client';

export function listCareRecipients(): Promise<CareRecipient[]> {
  return apiRequest('/api/care-recipients');
}

export function getCareRecipient(recipientId: number): Promise<CareRecipient> {
  return apiRequest(`/api/care-recipients/${recipientId}`);
}


export type CreateCareRecipientPayload = {
  name: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE';
  disabilityTypes: ('INTELLECTUAL' | 'AUTISM' | 'OTHER')[];
  disabilityGrade: number | null;
  otherDisabilityType: string | null;
};

export function createCareRecipient(payload: CreateCareRecipientPayload): Promise<CareRecipient> {
  return apiRequest('/api/care-recipients', { method: 'POST', body: payload });
}

export function claimCareRecipient(careRecipientNumber: string): Promise<CareRecipient> {
  return apiRequest('/api/care-recipients/claim', {
    method: 'POST',
    body: { careRecipientNumber },
  });
}

export type OrganizationLinkStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type OrganizationLinkInfo = {
  linkId: number;
  organizationId: number;
  organizationName: string;
  organizationCode: string;
  status: OrganizationLinkStatus;
  requestedAt: string;
};

export type AssignedWorkerInfo = {
  assignmentId: number;
  supportWorkerId: number;
  supportWorkerName: string;
  organizationId: number;
  organizationName: string;
  startDate: string;
  endDate: string | null;
  endedAt: string | null;
};

export type CareRelationsResponse = {
  careRecipientId: number;
  organizations: OrganizationLinkInfo[];
  assignments: AssignedWorkerInfo[];
};

export function getCareRelations(recipientId: number): Promise<CareRelationsResponse> {
  return apiRequest(`/api/care-recipients/${recipientId}/relations`);
}

export function requestOrganizationLink(
  recipientId: number,
  organizationCode: string,
): Promise<void> {
  return apiRequest(`/api/care-recipients/${recipientId}/organization-link-requests`, {
    method: 'POST',
    body: { organizationCode },
  });
}

export type GuardianStatus = 'PENDING' | 'ACTIVE' | 'REVOKED';

export type SecondaryGuardianResponse = {
  id: number;
  careRecipientId: number;
  guardianId: number;
  status: GuardianStatus;
  invitationToken: string | null;
  invitationExpiresAt: string | null;
  createdAt: string;
};

export function getSecondaryGuardian(recipientId: number): Promise<SecondaryGuardianResponse | null> {
  return apiRequest(`/api/care-recipients/${recipientId}/secondary-guardian`);
}

export function inviteSecondaryGuardian(
  recipientId: number,
  inviteePublicCode: string,
): Promise<SecondaryGuardianResponse> {
  return apiRequest(`/api/care-recipients/${recipientId}/secondary-guardian`, {
    method: 'PUT',
    body: { inviteePublicCode },
  });
}

export function revokeSecondaryGuardian(recipientId: number): Promise<void> {
  return apiRequest(`/api/care-recipients/${recipientId}/secondary-guardian`, {
    method: 'DELETE',
  });
}
