import { apiRequest } from './client';

export type AdminOrganization = {
  id: number;
  name: string;
  organizationCode: string;
  ownerId: number | null;
  ownerName: string | null;
  createdAt: string;
};

export function createAdminOrganization(payload: { name: string }): Promise<AdminOrganization> {
  return apiRequest('/api/admin/organizations', {
    method: 'POST',
    body: payload,
  });
}

export function getAdminOrganizations(): Promise<AdminOrganization[]> {
  return apiRequest('/api/admin/organizations');
}

export type AdminCareRecipient = {
  id: number;
  careRecipientNumber: string;
  name: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE';
  disabilityTypes: ('INTELLECTUAL' | 'AUTISM' | 'OTHER')[];
  disabilityGrade: number | null;
  otherDisabilityType: string | null;
  guardianName: string | null;
  guardianEmail: string | null;
  organizationName: string | null;
  createdAt: string;
};

export type CreateAdminCareRecipientPayload = {
  name: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE';
  disabilityTypes?: ('INTELLECTUAL' | 'AUTISM' | 'OTHER')[];
  disabilityGrade?: number | null;
  otherDisabilityType?: string | null;
};

export function createAdminCareRecipient(
  payload: CreateAdminCareRecipientPayload
): Promise<AdminCareRecipient> {
  return apiRequest('/api/admin/care-recipients', {
    method: 'POST',
    body: payload,
  });
}

export function getAdminCareRecipients(search?: string): Promise<AdminCareRecipient[]> {
  const url = search?.trim()
    ? `/api/admin/care-recipients?search=${encodeURIComponent(search.trim())}`
    : '/api/admin/care-recipients';
  return apiRequest(url);
}
