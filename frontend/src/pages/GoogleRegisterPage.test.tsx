import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import * as authApi from '../api/auth';
import { GoogleRegisterPage } from './GoogleRegisterPage';

const setAuth = vi.fn();
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ setAuth }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); setAuth.mockClear(); });

it('역할 선택 전에는 가입을 막고 선택한 역할과 동의 티켓으로 가입한다', async () => {
  const user = { id: 1, email: 'test@example.com', name: '테스트 사용자', role: 'GUARDIAN' as const, organizationId: null };
  const register = vi.spyOn(authApi, 'googleRegister').mockResolvedValue({ requiresConsent: false, accessToken: 'synthetic-token', user });
  render(
    <MemoryRouter initialEntries={[{ pathname: '/google-register', state: {
      pendingGoogle: { pendingToken: 'synthetic-pending', name: user.name, email: user.email }, consentTicket: 'synthetic-consent',
    } }]}>
      <Routes>
        <Route path="/google-register" element={<GoogleRegisterPage />} />
        <Route path="/home" element={<h1>홈 화면</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  const submit = screen.getByRole('button', { name: '가입하기' });
  expect(submit).toBeDisabled();
  fireEvent.click(screen.getByRole('radio', { name: /돌봄 보호자/ }));
  fireEvent.click(submit);
  await screen.findByRole('heading', { name: '홈 화면' });
  expect(register).toHaveBeenCalledWith({ pendingToken: 'synthetic-pending', consentTicket: 'synthetic-consent', role: 'GUARDIAN' });
  expect(setAuth).toHaveBeenCalledWith({ accessToken: 'synthetic-token', user });
});
