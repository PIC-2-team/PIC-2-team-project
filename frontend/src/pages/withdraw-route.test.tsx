import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { router } from '../router';
import { setTokenProvider } from '../api/client';

beforeEach(() => {
  setTokenProvider(() => null);
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    new Response(JSON.stringify({ success: true, data: { recipients: [], endedAssignmentCount: 0 } })));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

function signIn(role: string) {
  localStorage.setItem('sam_token', 'test-token');
  localStorage.setItem('sam_user', JSON.stringify({ id: 1, name: '테스트', email: 't@t.com', role }));
}

function open(path: string) {
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] });
  render(<AuthProvider><RouterProvider router={memoryRouter} /></AuthProvider>);
  return memoryRouter;
}

it.each(['GUARDIAN', 'SUPPORT_WORKER', 'INSTITUTION'])('%s는 탈퇴 화면에 들어갈 수 있다', async (role) => {
  signIn(role);
  const memoryRouter = open('/withdraw');

  expect(await screen.findByRole('heading', { name: '회원 탈퇴' })).toBeInTheDocument();
  expect(memoryRouter.state.location.pathname).toBe('/withdraw');
  memoryRouter.dispose();
});

it('관리자는 주소로 직접 열어도 탈퇴 화면에 들어갈 수 없고 어드민으로 보내진다', async () => {
  signIn('ADMIN');
  const memoryRouter = open('/withdraw');

  await vi.waitFor(() => expect(memoryRouter.state.location.pathname).toBe('/admin'));
  expect(screen.queryByRole('heading', { name: '회원 탈퇴' })).not.toBeInTheDocument();
  memoryRouter.dispose();
});

it('로그인하지 않으면 탈퇴 화면 대신 로그인 화면으로 보내진다', async () => {
  const memoryRouter = open('/withdraw');

  await vi.waitFor(() => expect(memoryRouter.state.location.pathname).toBe('/login'));
  memoryRouter.dispose();
});
