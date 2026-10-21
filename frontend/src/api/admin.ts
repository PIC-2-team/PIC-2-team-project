import { apiRequest } from './client';

export type AdminOrganization = {
  id: number;
  name: string;
  organizationCode: string;
  ownerId: number | null;
  ownerName: string | null;
  createdAt: string;
};

export type AdminUserSummary = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  publicCode: string;
  organizationId?: number | null;
  organizationName?: string | null;
  createdAt: string;
};

export type AdminRecordSummary = {
  id: number;
  careRecipientId: number;
  careRecipientName?: string | null;
  authorId: number;
  authorName?: string | null;
  content: string;
  category: string;
  recordedAt: string;
  createdAt: string;
};

export type PaginatedAdminUsers = {
  items: AdminUserSummary[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

export function createAdminOrganization(payload: { name: string }): Promise<AdminOrganization> {
  return apiRequest('/api/admin/organizations', {
    method: 'POST',
    body: payload,
  });
}

export function updateAdminOrganization(id: number, payload: { name: string }): Promise<AdminOrganization> {
  return apiRequest(`/api/admin/organizations/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteAdminOrganization(id: number): Promise<void> {
  return apiRequest(`/api/admin/organizations/${id}`, {
    method: 'DELETE',
  });
}

export function getAdminOrganizations(): Promise<AdminOrganization[]> {
  return apiRequest('/api/admin/organizations');
}

export function getAdminOrganizationRecords(id: number): Promise<AdminRecordSummary[]> {
  return apiRequest(`/api/admin/organizations/${id}/records`);
}

export function getAdminUsers(params?: {
  role?: string;
  organizationId?: number;
  page?: number;
  size?: number;
}): Promise<PaginatedAdminUsers> {
  const q = new URLSearchParams();
  if (params?.role) q.set('role', params.role);
  if (params?.organizationId) q.set('organizationId', String(params.organizationId));
  if (params?.page) q.set('page', String(params.page));
  if (params?.size) q.set('size', String(params.size));
  return apiRequest(`/api/admin/users?${q.toString()}`);
}

export function createAdminUser(payload: {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  organizationId?: number;
}): Promise<AdminUserSummary> {
  return apiRequest('/api/admin/users', {
    method: 'POST',
    body: payload,
  });
}

export function updateAdminUser(
  id: number,
  payload: {
    name: string;
    email: string;
    role: string;
    phone?: string;
    organizationId?: number;
  }
): Promise<AdminUserSummary> {
  return apiRequest(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteAdminUser(id: number): Promise<void> {
  return apiRequest(`/api/admin/users/${id}`, {
    method: 'DELETE',
  });
}

export function getAdminUserRecords(userId: number): Promise<AdminRecordSummary[]> {
  return apiRequest(`/api/admin/users/${userId}/records`);
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
