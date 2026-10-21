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

