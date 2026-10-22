import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import * as AuthContext from '../contexts/AuthContext';
import * as careRecipientsApi from '../api/careRecipients';
import * as recordsApi from '../api/records';
import * as careInfoApi from '../api/careInfo';
import type { User } from '../types/user';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mockNavigate.mockReset();
});

function renderHomePage(user: Partial<User> | null) {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: user as User | null,
    token: user ? 'mock-token' : null,
    selectedRecipientId: null,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    setAuth: vi.fn(),
    logout: vi.fn(),
    setSelectedRecipient: vi.fn(),
  });

  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

it('ADMIN 사용자는 /home 접근 시 /admin으로 리다이렉트된다', async () => {
  renderHomePage({ id: 1, name: '관리자', email: 'admin@test.com', role: 'ADMIN' });
  expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
});

it('INSTITUTION 사용자는 /home 접근 시 /agency로 리다이렉트된다', async () => {
  renderHomePage({ id: 2, name: '기관', email: 'inst@test.com', role: 'INSTITUTION' });
  expect(mockNavigate).toHaveBeenCalledWith('/agency', { replace: true });
});

it('보호자 사용자는 오늘의 기록과 중요 생활기록을 함께 확인한다', async () => {
  vi.spyOn(careRecipientsApi, 'listCareRecipients').mockResolvedValue([
    { id: 42, name: '홍길동', createdAt: '2026-10-10' } as any,
  ]);
  vi.spyOn(recordsApi, 'getTodayRecords').mockResolvedValue([
    { id: 1, content: '오늘 점심 잘 먹음', recordedAt: '2026-10-22T12:00:00Z', category: 'MEAL' } as any,
  ]);
  vi.spyOn(careInfoApi, 'getCareInfoOverview').mockResolvedValue({
    categories: [],
    pinnedRecords: [
      { id: 2, content: '중요: 특정 약 복용 주의', recordedAt: '2026-10-20T10:00:00Z', category: 'HEALTH', pinned: true } as any,
    ],
  });

  renderHomePage({ id: 3, name: '보호자', email: 'guardian@test.com', role: 'GUARDIAN' });

  expect(await screen.findByRole('heading', { name: /중요 생활기록/ })).toBeInTheDocument();
  expect(screen.getByText('중요: 특정 약 복용 주의')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /오늘의 기록/ })).toBeInTheDocument();
  expect(screen.getByText('오늘 점심 잘 먹음')).toBeInTheDocument();
});
