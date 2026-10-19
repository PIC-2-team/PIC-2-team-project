import type { CareRecipient } from '../types/careRecipient';
import { apiRequest } from './client';

export function listCareRecipients(): Promise<CareRecipient[]> {
  return apiRequest('/api/care-recipients');
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

