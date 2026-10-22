import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import * as authApi from '../api/auth';
import { router } from '../router';
import { setTokenProvider } from '../api/client';

beforeEach(() => {
  setTokenProvider(() => null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

it('앱 첫 화면에서 이용 동의 단계를 거치지 않고 로그인 화면을 보여준다', async () => {
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: ['/'] });
  render(<AuthProvider><RouterProvider router={memoryRouter} /></AuthProvider>);

  await screen.findByRole('heading', { name: '로그인' });
  expect(memoryRouter.state.location.pathname).toBe('/');
  memoryRouter.dispose();
});

it.each(['/records', '/care-info', '/records/7', '/records/new'])(
  '%s 직접 진입 시 인증 헤더와 함께 당사자를 조회한다', async path => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      const data = url === '/api/auth/login'
        ? { accessToken: 'test-token', user: { id: 1, name: '테스트', email: 'test@example.com', role: 'GUARDIAN' } }
        : url === '/api/care-recipients'
        ? [{ id: 42, name: '테스트 당사자' }]
        : url.includes('/care-info/')
          ? { category: 'COMMUNICATION', content: '테스트 돌봄정보', updatedAt: '2026-10-14' }
          : url.endsWith('/records/today')
          ? []
          : url.endsWith('/records/7')
            ? { id: 7, category: 'OTHER', content: '테스트 기록', recordedAt: '2026-10-14' }
            : { items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } };
      return new Response(JSON.stringify({ success: true, data }));
    });
    const memoryRouter = createMemoryRouter(router.routes, { initialEntries: ['/login'] });
    vi.spyOn(authApi, 'login').mockImplementation(async credentials => {
      const response = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
      return (await response.json()).data;
    });
    render(<AuthProvider><RouterProvider router={memoryRouter} /></AuthProvider>);
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'test-password' } });
    fireEvent.click(screen.getByRole('button', { name: /^로그인$/ }));
    await screen.findByText(/테스트 당사자/);
    await memoryRouter.navigate(path);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/care-recipients',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })));
    if (path === '/records/new') await screen.findByRole('heading', { name: '기록 작성' });
    else await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/42/'))).toBe(true));
    memoryRouter.dispose();
  },
);

it('당사자가 없으면 빈 기록으로 오인하지 않도록 안내한다', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const data = String(input) === '/api/auth/login'
      ? { accessToken: 'test-token', user: { id: 1, name: '테스트', email: 'test@example.com', role: 'GUARDIAN' } }
      : [];
    return new Response(JSON.stringify({ success: true, data }));
  });
  vi.spyOn(authApi, 'login').mockImplementation(async credentials => {
    const response = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    return (await response.json()).data;
  });
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: ['/login'] });
  render(<AuthProvider><RouterProvider router={memoryRouter} /></AuthProvider>);
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: /^로그인$/ }));
  await screen.findByText('테스트님, 당사자 정보를 먼저 등록해 주세요.');
  fireEvent.click(screen.getByRole('button', { name: '당사자 등록' }));
  await screen.findByRole('heading', { name: '당사자 기본 정보' });
  await memoryRouter.navigate('/home');
  await memoryRouter.navigate('/records');
  await screen.findByText('등록된 당사자가 없어요. 홈에서 당사자 정보를 확인해 주세요.');
  memoryRouter.dispose();
});

it('기록 화면에서 세션 갱신에 실패하면 로그인 화면으로 보내고 복귀 경로를 보존한다', async () => {
  let expireSession = false;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = String(input);
    if (url === '/api/auth/refresh') return new Response('', { status: 401 });
    if (expireSession && url.includes('/records?')) return new Response('', { status: 401 });
    const data = url === '/api/auth/login'
      ? { accessToken: 'expired-token', user: { id: 1, name: '테스트', email: 'test@example.com', role: 'GUARDIAN' } }
      : url === '/api/care-recipients'
        ? [{ id: 42, name: '테스트 당사자' }]
        : [];
    return new Response(JSON.stringify({ success: true, data }));
  });
  vi.spyOn(authApi, 'login').mockImplementation(async credentials => {
    const response = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    return (await response.json()).data;
  });

  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: ['/login'] });
  render(<AuthProvider><RouterProvider router={memoryRouter} /></AuthProvider>);
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: /^로그인$/ }));
  await screen.findByText(/테스트 당사자/);

  expireSession = true;
  await memoryRouter.navigate('/records');

  await screen.findByRole('heading', { name: '로그인' });
  expect(memoryRouter.state.location.pathname).toBe('/login');
  expect(memoryRouter.state.location.search).toBe('?redirect=%2Frecords');
  memoryRouter.dispose();
});
