import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { router } from '../router';
import { setTokenProvider } from '../api/client';

beforeEach(() => {
  localStorage.setItem('sam_token', 'test-token');
  localStorage.setItem('sam_user', JSON.stringify({ id: 1, name: '테스트', role: 'GUARDIAN' }));
  setTokenProvider(() => null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

it.each(['/records', '/care-info', '/records/7', '/records/new'])(
  '%s 직접 진입 시 인증 헤더와 함께 당사자를 조회한다', async path => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      const data = url === '/api/care-recipients'
        ? { items: [{ id: 42, name: '테스트 당사자' }] }
        : url.includes('/care-info/')
          ? { category: 'COMMUNICATION', content: '테스트 돌봄정보', updatedAt: '2026-10-14' }
          : url.endsWith('/records/7')
            ? { id: 7, category: 'OTHER', content: '테스트 기록', recordedAt: '2026-10-14' }
            : { items: [] };
      return new Response(JSON.stringify({ success: true, data }));
    });
    const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] });
    render(<AuthProvider><RouterProvider router={memoryRouter} /></AuthProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/care-recipients',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })));
    if (path === '/records/new') await screen.findByRole('heading', { name: '기록 작성' });
    else await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/42/'))).toBe(true));
    memoryRouter.dispose();
  },
);

it('당사자가 없으면 빈 기록으로 오인하지 않도록 안내한다', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true, data: { items: [] } })));
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: ['/records'] });
  render(<AuthProvider><RouterProvider router={memoryRouter} /></AuthProvider>);
  expect(await screen.findByText('등록된 당사자가 없어요. 홈에서 당사자 정보를 확인해 주세요.')).toBeInTheDocument();
  memoryRouter.dispose();
});
