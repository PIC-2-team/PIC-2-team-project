import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  expect(screen.getAllByText('삶결').length).toBeGreaterThanOrEqual(1);
  expect(screen.queryByRole('link', { name: '이용 동의로 돌아가기' })).not.toBeInTheDocument();
});

it('브랜드 히어로, 슬로건, 핵심 가치 카드 및 로그인 헤더가 표시된다', () => {
  renderLogin();
  expect(screen.getByText('삶의 결을 잇다')).toBeInTheDocument();
  expect(screen.getByText('보호자가 없어도 이어지는 맞춤 돌봄 기록')).toBeInTheDocument();
  expect(screen.getByText('쉬운 일상 기록')).toBeInTheDocument();
  expect(screen.getByText('믿을 수 있는 연결')).toBeInTheDocument();
  expect(screen.getByText('철저한 개인정보 보호')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: '로그인' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '회원가입' })).toHaveAttribute('href', '/consent');
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

it('이메일 찾기 모달을 열고 정보를 입력하여 가입된 이메일을 확인한다', async () => {
  const findEmailMock = vi.spyOn(authApi, 'findEmail').mockResolvedValue({ email: 'hon***@example.com' });
  renderLogin();

  fireEvent.click(screen.getByRole('button', { name: '이메일 찾기' }));
  const dialog = screen.getByRole('dialog', { name: '계정 찾기' });
  expect(dialog).toBeInTheDocument();

  fireEvent.change(within(dialog).getByPlaceholderText('가입 시 등록한 이름'), { target: { value: '홍길동' } });
  fireEvent.change(within(dialog).getByPlaceholderText('010-0000-0000'), { target: { value: '010-1234-5678' } });

  fireEvent.click(within(dialog).getByRole('button', { name: '이메일 조회' }));

  expect(await within(dialog).findByText('hon***@example.com')).toBeInTheDocument();
  expect(findEmailMock).toHaveBeenCalledWith({ name: '홍길동', phone: '010-1234-5678' });

  fireEvent.click(within(dialog).getByRole('button', { name: '로그인하러 가기' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('비밀번호 재설정 탭에서 정보를 입력하여 비밀번호를 재설정한다', async () => {
  const resetPasswordMock = vi.spyOn(authApi, 'resetPassword').mockResolvedValue(null);
  renderLogin();

  fireEvent.click(screen.getByRole('button', { name: '비밀번호 찾기' }));
  const dialog = screen.getByRole('dialog', { name: '계정 찾기' });
  expect(dialog).toBeInTheDocument();

  fireEvent.change(within(dialog).getByPlaceholderText('가입 시 등록한 이름'), { target: { value: '홍길동' } });
  fireEvent.change(within(dialog).getByPlaceholderText('010-0000-0000'), { target: { value: '010-1234-5678' } });
  fireEvent.change(within(dialog).getByPlaceholderText('example@samgyeol.com'), { target: { value: 'hong@example.com' } });
  fireEvent.change(within(dialog).getByPlaceholderText('8자 이상 입력'), { target: { value: 'newPassword123' } });
  fireEvent.change(within(dialog).getByPlaceholderText('새 비밀번호 다시 입력'), { target: { value: 'newPassword123' } });

  fireEvent.click(within(dialog).getByRole('button', { name: '비밀번호 변경' }));

  expect(await within(dialog).findByText('비밀번호가 성공적으로 변경되었습니다.')).toBeInTheDocument();
  expect(resetPasswordMock).toHaveBeenCalledWith({
    name: '홍길동',
    phone: '010-1234-5678',
    email: 'hong@example.com',
    newPassword: 'newPassword123',
  });

  fireEvent.click(within(dialog).getByRole('button', { name: '로그인하러 가기' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('이메일')).toHaveValue('hong@example.com');
});

it('비밀번호 재설정 시 새 비밀번호가 일치하지 않으면 오류를 안내한다', async () => {
  renderLogin();

  fireEvent.click(screen.getByRole('button', { name: '비밀번호 찾기' }));
  const dialog = screen.getByRole('dialog', { name: '계정 찾기' });

  fireEvent.change(within(dialog).getByPlaceholderText('가입 시 등록한 이름'), { target: { value: '홍길동' } });
  fireEvent.change(within(dialog).getByPlaceholderText('010-0000-0000'), { target: { value: '010-1234-5678' } });
  fireEvent.change(within(dialog).getByPlaceholderText('example@samgyeol.com'), { target: { value: 'hong@example.com' } });
  fireEvent.change(within(dialog).getByPlaceholderText('8자 이상 입력'), { target: { value: 'newPassword123' } });
  fireEvent.change(within(dialog).getByPlaceholderText('새 비밀번호 다시 입력'), { target: { value: 'differentPassword' } });

  fireEvent.click(within(dialog).getByRole('button', { name: '비밀번호 변경' }));

  expect(await within(dialog).findByText('새 비밀번호가 일치하지 않아요.')).toBeInTheDocument();
});

it('이메일 찾기 실패 시 오류 메시지를 안내한다', async () => {
  vi.spyOn(authApi, 'findEmail').mockRejectedValue(new Error('not found'));
  renderLogin();

  fireEvent.click(screen.getByRole('button', { name: '이메일 찾기' }));
  const dialog = screen.getByRole('dialog', { name: '계정 찾기' });

  fireEvent.change(within(dialog).getByPlaceholderText('가입 시 등록한 이름'), { target: { value: '홍길동' } });
  fireEvent.change(within(dialog).getByPlaceholderText('010-0000-0000'), { target: { value: '010-9999-9999' } });

  fireEvent.click(within(dialog).getByRole('button', { name: '이메일 조회' }));

  expect(await within(dialog).findByText('일치하는 회원 정보를 찾을 수 없어요. 이름과 전화번호를 확인해 주세요.')).toBeInTheDocument();
});
