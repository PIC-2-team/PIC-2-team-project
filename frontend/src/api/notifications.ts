import type { NotificationItem } from '../types/notification';
import type { PaginatedData } from '../types/common';
import { apiRequest } from './client';

export function getNotifications(params?: {
  read?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedData<NotificationItem>> {
  const query = new URLSearchParams();
  if (params?.read !== undefined) query.set('read', String(params.read));
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  return apiRequest(`/api/notifications${qs ? `?${qs}` : ''}`);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await apiRequest<{ unreadCount: number }>('/api/notifications/unread-count');
  return res.unreadCount;
}

export function markNotificationRead(id: number, read: boolean = true): Promise<NotificationItem> {
  return apiRequest(`/api/notifications/${id}`, {
    method: 'PATCH',
    body: { read },
  });
}

export function markAllNotificationsRead(): Promise<{ updatedCount: number }> {
  return apiRequest('/api/notifications/read-all', {
    method: 'PATCH',
    body: {},
  });
}
