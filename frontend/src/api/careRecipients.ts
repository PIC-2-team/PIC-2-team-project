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
