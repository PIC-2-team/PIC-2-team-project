import type { CareInfo, CareInfoCategory, CareInfoOverview } from '../types/careInfo';
import { apiRequest } from './client';

export function getCareInfoOverview(recipientId: number): Promise<CareInfoOverview> {
  return apiRequest(`/api/care-recipients/${recipientId}/care-info`);
}

export function getCareInfoByCategory(
  recipientId: number,
  category: CareInfoCategory
): Promise<CareInfo> {
  return apiRequest(`/api/care-recipients/${recipientId}/care-info/${category}`);
}
