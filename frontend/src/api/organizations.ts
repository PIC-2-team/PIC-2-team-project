import type { Organization, OrganizationMember, CareAssignment, LinkRequest } from '../types/agency';
import { apiRequest } from './client';

export function getMyOrganization(): Promise<Organization> {
  return apiRequest('/api/organizations/me');
}

export function getMembers(): Promise<OrganizationMember[]> {
  return apiRequest('/api/organizations/me/members');
}

export function getAssignments(): Promise<CareAssignment[]> {
  return apiRequest('/api/organizations/me/assignments');
}

export function getLinkRequests(): Promise<LinkRequest[]> {
  return apiRequest('/api/organizations/me/link-requests');
}
