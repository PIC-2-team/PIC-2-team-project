import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as client from './client';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from './notifications';

describe('notifications API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getNotifications calls apiRequest with query params', async () => {
    const spy = vi.spyOn(client, 'apiRequest').mockResolvedValue({
      items: [
        {
          id: 1,
          type: 'SUGGESTION_RECEIVED',
          message: '새 생활기록 수정 제안이 도착했습니다.',
          read: false,
          createdAt: '2026-10-22T10:00:00Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });

    const res = await getNotifications({ read: false, page: 1, pageSize: 10 });
    expect(spy).toHaveBeenCalledWith('/api/notifications?read=false&page=1&pageSize=10');
    expect(res.items).toHaveLength(1);
    expect(res.items[0].id).toBe(1);
  });

  it('getUnreadNotificationCount returns unreadCount', async () => {
    vi.spyOn(client, 'apiRequest').mockResolvedValue({ unreadCount: 3 });

    const count = await getUnreadNotificationCount();
    expect(count).toBe(3);
  });

  it('markNotificationRead sends PATCH with read boolean', async () => {
    const spy = vi.spyOn(client, 'apiRequest').mockResolvedValue({
      id: 1,
      type: 'SUGGESTION_RECEIVED',
      message: '새 제안',
      read: true,
      createdAt: '2026-10-22T10:00:00Z',
    });

    const res = await markNotificationRead(1, true);
    expect(spy).toHaveBeenCalledWith('/api/notifications/1', {
      method: 'PATCH',
      body: { read: true },
    });
    expect(res.read).toBe(true);
  });

  it('markAllNotificationsRead sends PATCH to /read-all', async () => {
    const spy = vi.spyOn(client, 'apiRequest').mockResolvedValue({ updatedCount: 5 });

    const res = await markAllNotificationsRead();
    expect(spy).toHaveBeenCalledWith('/api/notifications/read-all', {
      method: 'PATCH',
      body: {},
    });
    expect(res.updatedCount).toBe(5);
  });
});

afterEach(() => { vi.restoreAllMocks(); });

it('미읽음 개수 응답 객체에서 숫자를 추출한다', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    success: true, data: { unreadCount: 3 },
  }), { status: 200 }));
  expect(await getUnreadNotificationCount()).toBe(3);
});
