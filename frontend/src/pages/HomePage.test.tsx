import { act, waitFor, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import * as AuthContext from '../contexts/AuthContext';
import * as careRecipientsApi from '../api/careRecipients';
import * as recordsApi from '../api/records';
import * as careInfoApi from '../api/careInfo';
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
  expect(screen.getAllByText('중요: 특정 약 복용 주의')[0]).toBeInTheDocument();
  expect(screen.getByText('✨ 중요 돌봄 정보 요약')).toBeInTheDocument();
  expect(screen.getByText('돌봄 당사자')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /오늘의 기록/ })).toBeInTheDocument();
  expect(screen.getByText('오늘 점심 잘 먹음')).toBeInTheDocument();
});

it('보호자 사용자에게 대기 중인 활동지원사 수정 제안이 있을 경우 상단 알림 배너가 표시된다', async () => {
  vi.spyOn(careRecipientsApi, 'listCareRecipients').mockResolvedValue([
    { id: 42, name: '홍길동', createdAt: '2026-10-10' } as any,
  ]);
  vi.spyOn(recordsApi, 'getTodayRecords').mockResolvedValue([]);
  vi.spyOn(careInfoApi, 'getCareInfoOverview').mockResolvedValue({
    categories: [],
    pinnedRecords: [],
  });
  vi.spyOn(recordsApi, 'getRecordSuggestions').mockResolvedValue({
    items: [
      {
        id: 1,
        recordId: 10,
        original: { content: '기존', category: 'MEAL' },
        proposed: { content: '수정', category: 'MEAL' },
        suggestedBy: { id: 5, name: '이활동', role: 'SUPPORT_WORKER' },
        status: 'PENDING',
        createdAt: '2026-10-22T10:00:00Z',
      },
    ],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });

  renderHomePage({ id: 3, name: '보호자', email: 'guardian@test.com', role: 'GUARDIAN' });

  expect(await screen.findByText(/새로운 수정 제안이 1건 있어요/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /새로운 수정 제안이 1건 있어요/ })).toHaveAttribute(
    'href',
    '/record-suggestions'
  );
});

it('활동지원사 로그인 시 담당 당사자 정보 카드가 표시되고 프로필 모달을 열 수 있다', async () => {
  vi.spyOn(careRecipientsApi, 'listCareRecipients').mockResolvedValue([
    {
      id: 42,
      name: '김삼결',
      careRecipientNumber: 'KR-2026-0042',
      birthDate: '2000-01-01',
      gender: 'MALE',
      disabilityTypes: ['AUTISM'],
      disabilityGrade: 1,
      guardianName: '김보호',
      guardianPhone: '010-1234-5678',
    } as any,
  ]);
  vi.spyOn(recordsApi, 'getTodayRecords').mockResolvedValue([]);
  vi.spyOn(careInfoApi, 'getCareInfoOverview').mockResolvedValue({
    categories: [],
    pinnedRecords: [],
  });

  renderHomePage({
    id: 99,
    name: '김지원',
    email: 'worker@test.com',
    publicCode: 'SW-9999',
    role: 'SUPPORT_WORKER',
  });

  expect(await screen.findByText('담당 이용자')).toBeInTheDocument();
  expect(screen.getByText('등록코드: KR-2026-0042')).toBeInTheDocument();
  expect(screen.getByText(/김삼결 님/)).toBeInTheDocument();
  expect(screen.getByText(/자폐성 장애/)).toBeInTheDocument();
  expect(screen.getByText(/김보호/)).toBeInTheDocument();

  // 활동지원사 프로필 모달 테스트
  const profileBtn = screen.getByRole('button', { name: '내 프로필 정보 보기' });
  fireEvent.click(profileBtn);

  expect(await screen.findByRole('heading', { name: '활동지원사 정보' })).toBeInTheDocument();
  expect(screen.getByText('SW-9999')).toBeInTheDocument();
  expect(screen.getByText('worker@test.com')).toBeInTheDocument();

  // 모달 닫기
  fireEvent.click(screen.getByRole('button', { name: '확인' }));
  expect(screen.queryByRole('heading', { name: '활동지원사 정보' })).not.toBeInTheDocument();

  // 담당 이용자 상세 설명 모달 테스트
  const detailBtn = screen.getByRole('button', { name: /상세 설명 보기/ });
  fireEvent.click(detailBtn);

  expect(await screen.findByRole('heading', { name: '담당 이용자 상세 프로필' })).toBeInTheDocument();
  expect(screen.getByText('010-1234-5678')).toBeInTheDocument();
});
