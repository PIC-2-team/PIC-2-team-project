import type { DisabilitySeverity } from '../types/careRecipient';
import type { Organization, OrganizationMember, CareAssignment, LinkRequest, OrganizationCareRecipient, OrganizationGuardian, GuardianClaim } from '../types/agency';
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

export function verifyWorkerOrganization(organizationCode: string): Promise<Organization> {
  return apiRequest('/api/organizations/worker/verify', {
    method: 'POST',
    body: { organizationCode },
  });
}

export function getMembers(): Promise<OrganizationMember[]> {
  return apiRequest('/api/organizations/me/members');
}

export function addMember(payload: { publicCode: string }): Promise<OrganizationMember> {
  return apiRequest('/api/organizations/me/members', {
    method: 'POST',
    body: payload,
  });
}

export function updateMember(memberId: number, payload: { active: boolean }): Promise<OrganizationMember> {
  return apiRequest(`/api/organizations/me/members/${memberId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function updateMemberCharacteristics(memberId: number, characteristics: string): Promise<OrganizationMember> {
  return apiRequest(`/api/organizations/me/members/${memberId}/characteristics`, {
    method: 'PATCH',
    body: { characteristics },
  });
}

export function updateMemberStatus(memberId: number, active: boolean): Promise<OrganizationMember> {
  return updateMember(memberId, { active });
}

export function removeMember(memberId: number): Promise<void> {
  return apiRequest(`/api/organizations/me/members/${memberId}`, {
    method: 'DELETE',
  });
}

export function getOrganizationGuardians(): Promise<OrganizationGuardian[]> {
  return apiRequest('/api/organizations/me/guardians');
}

export function registerOrganizationGuardian(payload: { publicCode: string }): Promise<OrganizationGuardian> {
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

export function getOrganizationRecipients(): Promise<OrganizationCareRecipient[]> {
  return apiRequest('/api/organizations/me/recipients');
}

export function createOrganizationRecipient(payload: {
  name: string;
  birthDate: string;
  gender: string;
  disabilityTypes?: string[];
  disabilitySeverity?: DisabilitySeverity | null;
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
    disabilitySeverity?: DisabilitySeverity | null;
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

export type ConnectionDecision = 'accept' | 'reject';

export function decideOrganizationLinkRequest(
  careRecipientId: number,
  linkId: number,
  decision: ConnectionDecision,
): Promise<void> {
  return apiRequest(
    `/api/care-recipients/${careRecipientId}/organization-link-requests/${linkId}/${decision}`,
    { method: 'POST' },
  );
}

export function getGuardianClaims(): Promise<GuardianClaim[]> {
  return apiRequest('/api/organizations/me/guardian-claims');
}

export function decideGuardianClaim(claimId: number, decision: ConnectionDecision): Promise<void> {
  return apiRequest(`/api/organizations/me/guardian-claims/${claimId}/${decision}`, { method: 'POST' });
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
