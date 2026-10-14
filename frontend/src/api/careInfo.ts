import type { CareInfo, CareInfoCategory } from '../types/careInfo';
import { apiRequest } from './client';

export function getCareInfoByCategory(
  recipientId: number,
  category: CareInfoCategory
): Promise<CareInfo> {
  return apiRequest(`/api/care-recipients/${recipientId}/care-info/${category}`);
}
