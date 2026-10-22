import { apiRequest } from './client';

export function getUnreadNotificationCount(): Promise<number> {
  return apiRequest<number>('/api/notifications/unread-count');
}
