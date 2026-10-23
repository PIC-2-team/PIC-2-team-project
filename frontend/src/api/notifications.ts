import { apiRequest } from './client';

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiRequest<{ unreadCount: number }>('/api/notifications/unread-count');
  return response.unreadCount;
}
