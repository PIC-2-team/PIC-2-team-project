import type { Organization, OrganizationMember, CareAssignment, LinkRequest, OrganizationCareRecipient, OrganizationGuardian } from '../types/agency';
import { apiRequest } from './client';

export function registerOrganization(payload: { organizationCode: string }): Promise<Organization> {
  return apiRequest('/api/organizations', {
    method: 'POST',
    body: payload,
  });
}

// 하위 호환성을 위해 유지
export function createOrganization(payload: { name?: string; organizationCode?: string }): Promise<Organization> {
  return apiRequest('/api/organizations', {
    method: 'POST',
    body: payload,
  });
}

export function getMyOrganization(): Promise<Organization> {
  return apiRequest('/api/organizations/me');
}

export function getMembers(): Promise<OrganizationMember[]> {
  return apiRequest('/api/organizations/me/members');
}

export function addMember(userId: number): Promise<OrganizationMember> {
  return apiRequest('/api/organizations/me/members', {
    method: 'POST',
    body: { userId },
  });
}

export function updateMemberStatus(memberId: number, active: boolean): Promise<OrganizationMember> {
  return apiRequest(`/api/organizations/me/members/${memberId}`, {
    method: 'PATCH',
    body: { active },
  });
}

export function removeMember(memberId: number): Promise<void> {
  return apiRequest(`/api/organizations/me/members/${memberId}`, {
    method: 'DELETE',
  });
}

export function getOrganizationRecipients(): Promise<OrganizationCareRecipient[]> {
  return apiRequest('/api/organizations/me/recipients');
}

export function createOrganizationRecipient(payload: {
  name: string;
  birthDate: string;
  gender: string;
  disabilityTypes?: string[];
  disabilityGrade?: number | null;
  otherDisabilityType?: string | null;
}): Promise<OrganizationCareRecipient> {
  return apiRequest('/api/organizations/me/recipients', {
    method: 'POST',
    body: {
      ...payload,
      disabilityTypes: payload.disabilityTypes && payload.disabilityTypes.length > 0 ? payload.disabilityTypes : ['INTELLECTUAL'],
    },
  });
}

export function updateOrganizationRecipient(
  recipientId: number,
  payload: Partial<{
    name: string;
    birthDate: string;
    gender: string;
    disabilityTypes?: string[];
    disabilityGrade?: number | null;
    otherDisabilityType?: string | null;
  }>
): Promise<OrganizationCareRecipient> {
  return apiRequest(`/api/organizations/me/recipients/${recipientId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteOrganizationRecipient(recipientId: number): Promise<void> {
  return apiRequest(`/api/organizations/me/recipients/${recipientId}`, {
    method: 'DELETE',
  });
}

export function getAssignments(): Promise<CareAssignment[]> {
  return apiRequest('/api/organizations/me/assignments');
}

export function getLinkRequests(): Promise<LinkRequest[]> {
  return apiRequest('/api/organizations/me/link-requests');
}

export function assignSupportWorker(payload: {
  careRecipientId: number;
  supportWorkerId: number;
  startDate: string;
  endDate?: string | null;
  idempotencyKey?: string;
}): Promise<CareAssignment> {
  const body = {
    ...payload,
    idempotencyKey: payload.idempotencyKey || `assign-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  };
  return apiRequest('/api/organizations/me/assignments', {
    method: 'POST',
    body,
  });
}

export function endAssignment(assignmentId: number): Promise<void> {
  return apiRequest(`/api/organizations/me/assignments/${assignmentId}/end`, {
    method: 'PATCH',
  });
}

export function getOrganizationGuardians(): Promise<OrganizationGuardian[]> {
  return apiRequest('/api/organizations/me/guardians');
}

export function registerOrganizationGuardian(payload: { phone?: string; guardianCodeOrEmail?: string }): Promise<OrganizationGuardian> {
  return apiRequest('/api/organizations/me/guardians', {
    method: 'POST',
    body: payload,
  });
}

export function removeOrganizationGuardian(guardianId: number): Promise<void> {
  return apiRequest(`/api/organizations/me/guardians/${guardianId}`, {
    method: 'DELETE',
  });
}
