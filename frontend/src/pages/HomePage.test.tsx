import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

it('보호자 사용자는 중요 돌봄 정보를 중복 없이 오늘의 기록과 함께 확인한다', async () => {
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

  expect(await screen.findByRole('heading', { name: /중요 돌봄 정보/ })).toBeInTheDocument();
  expect(screen.getAllByText('중요: 특정 약 복용 주의')).toHaveLength(1);
  expect(screen.queryByText('✨ 중요 돌봄 정보 요약')).not.toBeInTheDocument();
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
