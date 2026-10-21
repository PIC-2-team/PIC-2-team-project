import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardPage } from './AdminDashboardPage';
import * as AuthContext from '../contexts/AuthContext';
import type { User } from '../types/user';
import type { AdminCareRecipient } from '../api/admin';

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

const MOCK_STATS = {
  totalUsers: 142,
  guardians: 89,
  supportWorkers: 43,
  institutions: 10,
  totalOrganizations: 8,
  totalCareRecipients: 76,
  totalRecords: 1254,
};

const MOCK_USERS = {
  items: [
    { id: 1, name: '김보호', email: 'guardian1@test.com', role: 'GUARDIAN', publicCode: 'G-1001', createdAt: '2026-10-15T09:30:00Z' },
    { id: 2, name: '이지원', email: 'worker1@test.com', role: 'SUPPORT_WORKER', publicCode: 'W-2001', createdAt: '2026-10-16T11:20:00Z' },
  ],
  pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
};

const MOCK_ORGS = [
  { id: 1, name: '행복복지관', organizationCode: 'KNU001', ownerId: 10, ownerName: '박담당', createdAt: '2026-10-18T10:00:00Z' },
  { id: 2, name: '미등록센터', organizationCode: 'NOT999', ownerId: null, ownerName: null, createdAt: '2026-10-19T10:00:00Z' },
];

const MOCK_RECIPIENTS: AdminCareRecipient[] = [
  {
    id: 1,
    careRecipientNumber: 'R-KNU12345',
    name: '김당사',
    birthDate: '2010-05-15',
    gender: 'MALE',
    disabilityTypes: ['AUTISM'],
    disabilityGrade: 1,
    otherDisabilityType: null,
    guardianName: '김보호',
    guardianEmail: 'guardian1@test.com',
    organizationName: '행복복지관',
    createdAt: '2026-10-18T11:00:00Z',
  },
  {
    id: 2,
    careRecipientNumber: 'R-NEW99999',
    name: '이신규',
    birthDate: '2015-08-20',
    gender: 'FEMALE',
    disabilityTypes: ['INTELLECTUAL'],
    disabilityGrade: null,
    otherDisabilityType: null,
    guardianName: null,
    guardianEmail: null,
    organizationName: null,
    createdAt: '2026-10-20T10:00:00Z',
  },
];

function renderAdminPage() {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: { id: 999, name: '최고관리자', email: 'admin@samgyeol.com', role: 'ADMIN' } as User,
    token: 'mock-token',
    selectedRecipientId: null,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    setAuth: vi.fn(),
    logout: vi.fn(),
    setSelectedRecipient: vi.fn(),
  });

  return render(
    <MemoryRouter>
      <AdminDashboardPage />
    </MemoryRouter>
  );
}

it('통계 및 사용자 목록을 성공적으로 렌더링한다', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/api/admin/stats')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_STATS }), { status: 200 });
    }
    if (url.includes('/api/admin/users')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_USERS }), { status: 200 });
    }
    if (url.includes('/api/admin/organizations')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_ORGS }), { status: 200 });
    }
    if (url.includes('/api/admin/care-recipients')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_RECIPIENTS }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  renderAdminPage();

  expect(await screen.findByText('최고관리자님')).toBeInTheDocument();
  expect(await screen.findByText('142')).toBeInTheDocument();
  expect(screen.getByText('김보호')).toBeInTheDocument();
  expect(screen.getByText('이지원')).toBeInTheDocument();
  expect(screen.getByText('G-1001')).toBeInTheDocument();
});

it('역할 필터를 변경하면 해당 역할을 포함하여 사용자 목록을 요청한다', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/api/admin/stats')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_STATS }), { status: 200 });
    }
    if (url.includes('/api/admin/users')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_USERS }), { status: 200 });
    }
    if (url.includes('/api/admin/organizations')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_ORGS }), { status: 200 });
    }
    if (url.includes('/api/admin/care-recipients')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_RECIPIENTS }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  renderAdminPage();

  await screen.findByText('김보호');

  const filterSelect = screen.getByLabelText('역할 필터');
  fireEvent.change(filterSelect, { target: { value: 'GUARDIAN' } });

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/api/admin/users?page=1&size=20&role=GUARDIAN'),
    expect.anything()
  );
});

it('기관 관리 섹션에서 기관 목록을 조회하고 새로운 기관을 생성(코드 발급)할 수 있다', async () => {
  let orgs = [...MOCK_ORGS];
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/api/admin/stats')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_STATS }), { status: 200 });
    }
    if (url.includes('/api/admin/users')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_USERS }), { status: 200 });
    }
    if (url.endsWith('/api/admin/organizations') && method === 'POST') {
      const newOrg = {
        id: 3,
        name: '새솔복지관',
        organizationCode: 'NEW003',
        ownerId: null,
        ownerName: null,
        createdAt: '2026-10-20T12:00:00Z',
      };
      orgs = [newOrg, ...orgs];
      return new Response(JSON.stringify({ success: true, data: newOrg }), { status: 201 });
    }
    if (url.includes('/api/admin/organizations')) {
      return new Response(JSON.stringify({ success: true, data: orgs }), { status: 200 });
    }
    if (url.includes('/api/admin/care-recipients')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_RECIPIENTS }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  renderAdminPage();

  expect(await screen.findByText('행복복지관')).toBeInTheDocument();
  expect(screen.getByText('KNU001')).toBeInTheDocument();
  expect(screen.getByText('박담당')).toBeInTheDocument();
  expect(screen.getByText('미등록')).toBeInTheDocument();

  // 신규 기관 생성
  fireEvent.change(screen.getByLabelText('신규 기관 이름'), { target: { value: '새솔복지관' } });
  fireEvent.click(screen.getByRole('button', { name: '기관 코드 발급' }));

  expect(fetchMock).toHaveBeenCalledWith('/api/admin/organizations', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ name: '새솔복지관' }),
  }));

  expect(await screen.findByText('새솔복지관')).toBeInTheDocument();
  expect(screen.getByText('NEW003')).toBeInTheDocument();
});

it('당사자 고유 코드 목록을 조회하고 신규 당사자 코드를 발급할 수 있다', async () => {
  let recipients = [...MOCK_RECIPIENTS];
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/api/admin/stats')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_STATS }), { status: 200 });
    }
    if (url.includes('/api/admin/users')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_USERS }), { status: 200 });
    }
    if (url.includes('/api/admin/organizations')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_ORGS }), { status: 200 });
    }
    if (url.endsWith('/api/admin/care-recipients') && method === 'POST') {
      const newRecipient: AdminCareRecipient = {
        id: 3,
        careRecipientNumber: 'R-GEN77777',
        name: '박희망',
        birthDate: '2018-03-10',
        gender: 'MALE',
        disabilityTypes: ['AUTISM'],
        disabilityGrade: 1,
        otherDisabilityType: null,
        guardianName: null,
        guardianEmail: null,
        organizationName: null,
        createdAt: '2026-10-21T09:00:00Z',
      };
      recipients = [newRecipient, ...recipients];
      return new Response(JSON.stringify({ success: true, data: newRecipient }), { status: 201 });
    }
    if (url.includes('/api/admin/care-recipients')) {
      return new Response(JSON.stringify({ success: true, data: recipients }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  renderAdminPage();

  // 기존 당사자 렌더링 확인
  expect(await screen.findByText('김당사')).toBeInTheDocument();
  expect(screen.getByText('R-KNU12345')).toBeInTheDocument();
  expect(screen.getByText('보호자: 김보호')).toBeInTheDocument();
  expect(screen.getByText('소속: 행복복지관')).toBeInTheDocument();

  expect(screen.getByText('이신규')).toBeInTheDocument();
  expect(screen.getByText('R-NEW99999')).toBeInTheDocument();
  expect(screen.getByText('미연결 (발급 완료)')).toBeInTheDocument();

  // 신규 당사자 등록 폼 작성
  fireEvent.change(screen.getByLabelText('신규 당사자 이름'), { target: { value: '박희망' } });
  fireEvent.change(screen.getByLabelText('당사자 생년월일'), { target: { value: '2018-03-10' } });
  fireEvent.click(screen.getByLabelText('자폐성 장애'));
  fireEvent.change(screen.getByPlaceholderText('예: 1 또는 2'), { target: { value: '1' } });

  // 발급 버튼 클릭
  fireEvent.click(screen.getByRole('button', { name: '당사자 고유 코드 발급' }));

  expect(fetchMock).toHaveBeenCalledWith('/api/admin/care-recipients', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({
      name: '박희망',
      birthDate: '2018-03-10',
      gender: 'MALE',
      disabilityTypes: ['AUTISM'],
      disabilityGrade: 1,
      otherDisabilityType: null,
    }),
  }));

  // 발급 완료 피드백 및 목록 업데이트 확인
  expect(await screen.findByText(/'박희망' 당사자 고유 코드 발급 완료/)).toBeInTheDocument();
  expect(screen.getAllByText('R-GEN77777')).toHaveLength(2);
  expect(screen.getByRole('button', { name: '코드 복사' })).toBeInTheDocument();
});

it('당사자 고유 코드 검색창에 입력 후 검색하면 검색 쿼리로 요청한다', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/api/admin/stats')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_STATS }), { status: 200 });
    }
    if (url.includes('/api/admin/users')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_USERS }), { status: 200 });
    }
    if (url.includes('/api/admin/organizations')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_ORGS }), { status: 200 });
    }
    if (url.includes('/api/admin/care-recipients')) {
      return new Response(JSON.stringify({ success: true, data: [MOCK_RECIPIENTS[0]] }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  renderAdminPage();

  await screen.findByText('김당사');

  const searchInput = screen.getByLabelText('당사자 검색');
  fireEvent.change(searchInput, { target: { value: '김당사' } });
  fireEvent.click(screen.getByRole('button', { name: '검색' }));

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/api/admin/care-recipients?search=%EA%B9%80%EB%8B%B9%EC%82%AC'),
    expect.anything()
  );
});

it('고유 코드 복사 버튼 클릭 시 클립보드에 복사되고 복사됨 피드백이 표시된다', async () => {
  const writeTextMock = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, {
    clipboard: { writeText: writeTextMock },
  });

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/api/admin/stats')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_STATS }), { status: 200 });
    }
    if (url.includes('/api/admin/users')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_USERS }), { status: 200 });
    }
    if (url.includes('/api/admin/organizations')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_ORGS }), { status: 200 });
    }
    if (url.includes('/api/admin/care-recipients')) {
      return new Response(JSON.stringify({ success: true, data: [MOCK_RECIPIENTS[0]] }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  renderAdminPage();

  await screen.findByText('김당사');

  const copyBtn = screen.getByRole('button', { name: '김당사 고유 코드 복사' });
  fireEvent.click(copyBtn);

  expect(writeTextMock).toHaveBeenCalledWith('R-KNU12345');
  expect(await screen.findByText('복사됨!')).toBeInTheDocument();
});
