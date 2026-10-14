import type { CareRecipient } from '../types/careRecipient';
import type { PaginatedData } from '../types/common';
import { apiRequest } from './client';

export function listCareRecipients(): Promise<PaginatedData<CareRecipient>> {
  return apiRequest('/api/care-recipients');
}
