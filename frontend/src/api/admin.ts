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
