import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import { LoginPage } from './LoginPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  delete window.google;
});

function ConsentRoute() {
  const location = useLocation();
  return (
    <>
      <h1>이용 동의</h1>
      <output data-testid="consent-path">{location.pathname}</output>
      <output data-testid="pending-google">{JSON.stringify(location.state?.pendingGoogle)}</output>
    </>
  );
}

function renderLogin(path = '/login') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/home" element={<h1>홈 화면</h1>} />
          <Route path="/agency" element={<h1>기관 화면</h1>} />
          <Route path="/records" element={<h1>기록 화면</h1>} />
          <Route path="/consent" element={<ConsentRoute />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

function submit() {
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: '로그인' }));
}

it('로그인 화면에서 이용 동의로 돌아가는 링크를 제공하지 않는다', () => {
  renderLogin();
  expect(screen.getByText('삶결')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: '이용 동의로 돌아가기' })).not.toBeInTheDocument();
});

it.each([
  ['GUARDIAN', '/login', '홈 화면'],
  ['INSTITUTION', '/login', '기관 화면'],
  ['GUARDIAN', '/login?redirect=/records', '기록 화면'],
] as const)('이메일 로그인 후 역할과 목적지를 유지한다: %s %s', async (role, path, heading) => {
  const login = vi.spyOn(authApi, 'login').mockResolvedValue({
    accessToken: 'test-token', user: { id: 1, name: '테스트', email: 'test@example.com', role },
  });
  renderLogin(path);
  submit();
  expect(screen.getByRole('button', { name: '로그인 중…' })).toBeDisabled();
  await screen.findByRole('heading', { name: heading });
  expect(login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'test-password' });
});

it('잘못된 인증 정보를 안내하고 재시도할 수 있다', async () => {
  vi.spyOn(authApi, 'login').mockRejectedValue(new ApiError('UNAUTHORIZED', 'invalid', 401));
  renderLogin();
  submit();
  expect(await screen.findByRole('alert')).toHaveTextContent('이메일 또는 비밀번호가 올바르지 않아요.');
  expect(screen.getByRole('button', { name: '로그인' })).toBeEnabled();
});

it('Google 가입이 필요한 사용자는 별도 이용 동의 경로로 안내한다', async () => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client');
  const initialize = vi.fn();
  window.google = { accounts: { id: { initialize, renderButton: vi.fn() } } };
  const googleLogin = vi.spyOn(authApi, 'googleLogin').mockResolvedValue({
    requiresConsent: true, googleEmail: 'test@example.com', googleName: '테스트', pendingToken: 'test-pending',
  });
  renderLogin();
  initialize.mock.calls[0][0].callback({ credential: 'test-google-token' });
  await screen.findByRole('heading', { name: '이용 동의' });
  expect(screen.getByTestId('consent-path')).toHaveTextContent('/consent');
  expect(screen.getByTestId('pending-google')).toHaveTextContent(
    JSON.stringify({ pendingToken: 'test-pending', email: 'test@example.com', name: '테스트' }),
  );
  expect(googleLogin).toHaveBeenCalledWith('test-google-token');
});
