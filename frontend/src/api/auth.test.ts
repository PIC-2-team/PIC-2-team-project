import { afterEach, expect, it, vi } from 'vitest';
import { findEmail, resetPassword } from './auth';

afterEach(() => {
  vi.restoreAllMocks();
});

it('이메일 찾기 요청을 올바른 경로와 파라미터로 전송한다', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ success: true, data: { email: 'hon***@example.com' } }))
  );

  const res = await findEmail({ name: '홍길동', phone: '010-1234-5678' });

  expect(res.email).toBe('hon***@example.com');
  expect(fetchMock).toHaveBeenCalledWith('/api/auth/find-email', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ name: '홍길동', phone: '010-1234-5678' }),
  }));
});

it('비밀번호 재설정 요청을 올바른 경로와 파라미터로 전송한다', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ success: true, data: null }))
  );

  await resetPassword({
    name: '홍길동',
    phone: '010-1234-5678',
    email: 'hong@example.com',
    newPassword: 'newPassword123',
  });

  expect(fetchMock).toHaveBeenCalledWith('/api/auth/reset-password', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({
      name: '홍길동',
      phone: '010-1234-5678',
      email: 'hong@example.com',
      newPassword: 'newPassword123',
    }),
  }));
});
