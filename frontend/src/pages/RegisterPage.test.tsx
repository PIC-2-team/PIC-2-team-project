import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';

const setAuth = vi.fn();
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ setAuth }) }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mockNavigate.mockClear();
  setAuth.mockClear();
});

it('뒤로가기 버튼을 클릭하면 이전 화면으로 이동한다', () => {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/register', state: { consentTicket: 'synthetic-ticket', role: 'GUARDIAN' } }]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </MemoryRouter>,
  );

  const backButton = screen.getByRole('button', { name: '뒤로가기' });
  expect(backButton).toBeInTheDocument();
  fireEvent.click(backButton);
  expect(mockNavigate).toHaveBeenCalledWith(-1);
});

it('state에 consentTicket이나 role이 없으면 /consent로 이동한다', () => {
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(mockNavigate).toHaveBeenCalledWith('/consent', { replace: true });
});
