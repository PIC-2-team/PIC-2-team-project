import { afterEach, expect, it, vi } from 'vitest';
import { getUnreadNotificationCount } from './notifications';

afterEach(() => { vi.restoreAllMocks(); });

it('미읽음 개수 응답 객체에서 숫자를 추출한다', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    success: true, data: { unreadCount: 3 },
  }), { status: 200 }));
  expect(await getUnreadNotificationCount()).toBe(3);
});
