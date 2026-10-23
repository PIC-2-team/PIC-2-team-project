import { act, waitFor, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import * as AuthContext from '../contexts/AuthContext';
import * as careRecipientsApi from '../api/careRecipients';
import * as recordsApi from '../api/records';
import type { User } from '../types/user';
import type { DailyRecord } from '../types/record';

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

it('당사자가 2명 이상이면 당사자 전환 select가 표시된다', async () => {
  const mockSetSelectedRecipient = vi.fn();
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: { id: 1, name: '보호자', email: 'g@test.com', role: 'GUARDIAN' } as User,
    token: 'tok',
    selectedRecipientId: 1,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    setAuth: vi.fn(),
    logout: vi.fn(),
    setSelectedRecipient: mockSetSelectedRecipient,
  });
  vi.spyOn(careRecipientsApi, 'listCareRecipients').mockResolvedValue([
    { id: 1, name: '김철수' } as any,
    { id: 2, name: '이영희' } as any,
  ]);
  vi.spyOn(recordsApi, 'getTodayRecords').mockResolvedValue([]);

  render(<MemoryRouter><HomePage /></MemoryRouter>);

  expect(await screen.findByRole('combobox', { name: '당사자 선택' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: '김철수' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: '이영희' })).toBeInTheDocument();
});

it('데이터 로딩 중에는 스켈레톤 로딩 UI가 표시된다', () => {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: { id: 1, name: '보호자', email: 'g@test.com', role: 'GUARDIAN' } as User,
    token: 'tok',
    selectedRecipientId: null,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    setAuth: vi.fn(),
    logout: vi.fn(),
    setSelectedRecipient: vi.fn(),
  });
  vi.spyOn(careRecipientsApi, 'listCareRecipients').mockImplementation(
    () => new Promise(() => {})
  );
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  expect(screen.queryByText('불러오는 중…')).not.toBeInTheDocument();
  expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
});

it('당사자 select 변경 시 setSelectedRecipient가 호출된다', async () => {
  const mockSetSelectedRecipient = vi.fn();
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: { id: 1, name: '보호자', email: 'g@test.com', role: 'GUARDIAN' } as User,
    token: 'tok',
    selectedRecipientId: 1,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    setAuth: vi.fn(),
    logout: vi.fn(),
    setSelectedRecipient: mockSetSelectedRecipient,
  });
  vi.spyOn(careRecipientsApi, 'listCareRecipients').mockResolvedValue([
    { id: 1, name: '김철수' } as any,
    { id: 2, name: '이영희' } as any,
  ]);
  vi.spyOn(recordsApi, 'getTodayRecords').mockResolvedValue([]);

  render(<MemoryRouter><HomePage /></MemoryRouter>);

  const sel = await screen.findByRole('combobox', { name: '당사자 선택' });
  fireEvent.change(sel, { target: { value: '2' } });

  expect(mockSetSelectedRecipient).toHaveBeenCalledWith(2);
});

it('당사자 전환의 이전 응답이 늦게 도착해도 마지막 선택과 기록을 유지한다', async () => {
  let resolveSecond!: (records: DailyRecord[]) => void;
  let resolveThird!: (records: DailyRecord[]) => void;
  const second = new Promise<DailyRecord[]>(resolve => { resolveSecond = resolve; });
  const third = new Promise<DailyRecord[]>(resolve => { resolveThird = resolve; });
  vi.spyOn(careRecipientsApi, 'listCareRecipients').mockResolvedValue([
    { id: 1, name: '첫 당사자' }, { id: 2, name: '둘째 당사자' }, { id: 3, name: '셋째 당사자' },
  ] as Awaited<ReturnType<typeof careRecipientsApi.listCareRecipients>>);
  vi.spyOn(recordsApi, 'getTodayRecords').mockResolvedValueOnce([])
    .mockReturnValueOnce(second).mockReturnValueOnce(third);
  renderHomePage({ id: 1, name: '보호자', role: 'GUARDIAN' });
  const select = await screen.findByRole('combobox', { name: '당사자 선택' });
  fireEvent.change(select, { target: { value: '2' } });
  fireEvent.change(select, { target: { value: '3' } });
  await act(async () => { resolveThird([{ id: 3, content: '셋째 당사자 기록', category: 'MEAL', recordedAt: '2026-10-23T00:00:00Z' }]); });
  await waitFor(() => expect(select).toHaveValue('3'));
  await act(async () => { resolveSecond([{ id: 2, content: '둘째 당사자 기록', category: 'MEAL', recordedAt: '2026-10-23T00:00:00Z' }]); });
  expect(select).toHaveValue('3');
  expect(screen.getByText('셋째 당사자 기록')).toBeInTheDocument();
  expect(screen.queryByText('둘째 당사자 기록')).not.toBeInTheDocument();
});
