import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardPage } from './AdminDashboardPage';
import * as AuthContext from '../contexts/AuthContext';
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
    { id: 1, name: '김보호', email: 'guardian1@test.com', role: 'GUARDIAN', publicCode: 'G-1001', organizationName: null, createdAt: '2026-10-15T09:30:00Z' },
    { id: 2, name: '이지원', email: 'worker1@test.com', role: 'SUPPORT_WORKER', publicCode: 'W-2001', organizationName: '행복복지관', createdAt: '2026-10-16T11:20:00Z' },
  ],
  pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
};

const MOCK_ORGS = [
  { id: 1, name: '행복복지관', organizationCode: 'KNU001', ownerId: 10, ownerName: '박담당', createdAt: '2026-10-18T10:00:00Z' },
  { id: 2, name: '미등록센터', organizationCode: 'NOT999', ownerId: null, ownerName: null, createdAt: '2026-10-19T10:00:00Z' },
];

function renderAdminPage(initialEntries = ['/admin']) {
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
    <MemoryRouter initialEntries={initialEntries}>
      <AdminDashboardPage />
    </MemoryRouter>
  );
}

it('통계 및 하단바 탭을 렌더링하고, 사용자 목록 탭으로 전환하여 사용자 목록을 확인할 수 있다', async () => {
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
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  renderAdminPage();

  expect(await screen.findByText('최고관리자님')).toBeInTheDocument();
  expect(await screen.findByText('142')).toBeInTheDocument();

  // 하단바 탭 확인
  const userTab = await screen.findByRole('tab', { name: /사용자 목록/ });
  expect(userTab).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /기관 관리/ })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '더보기' })).toBeInTheDocument();

  // 사용자 목록 탭으로 전환
  fireEvent.click(userTab);

  expect(await screen.findByText('김보호')).toBeInTheDocument();
  expect(screen.getByText('이지원')).toBeInTheDocument();
  expect(screen.getByText('G-1001')).toBeInTheDocument();
});

it('역할 및 기관 필터를 변경하면 해당 조건을 포함하여 사용자 목록을 요청한다', async () => {
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
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  renderAdminPage(['/admin?tab=users']);

  await screen.findByText('김보호');

  // 역할 필터 변경
  const filterSelect = screen.getByLabelText('역할 필터');
  fireEvent.change(filterSelect, { target: { value: 'GUARDIAN' } });

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('role=GUARDIAN'),
    expect.anything()
  );

  // 기관 필터 변경
  const orgFilterSelect = screen.getByLabelText('기관 필터');
  fireEvent.change(orgFilterSelect, { target: { value: '1' } });

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('organizationId=1'),
    expect.anything()
  );
});

it('기관 관리에서 기관 목록 조회, 신규 생성, 수정, 삭제가 모두 가능하다', async () => {
  let orgs = [...MOCK_ORGS];
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/api/admin/stats')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_STATS }), { status: 200 });
    }
    if (url.includes('/api/admin/users')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_USERS }), { status: 200 });
    }
    if (url.match(/\/api\/admin\/organizations\/\d+/) && method === 'PATCH') {
      return new Response(JSON.stringify({ success: true, data: { id: 1, name: '기관_수정', organizationCode: 'CODE1' } }), { status: 200 });
    }
    if (url.match(/\/api\/admin\/organizations\/\d+/) && method === 'DELETE') {
      return new Response(JSON.stringify({ success: true, data: null }), { status: 200 });
    }
    if (url.includes('/api/admin/organizations') && method === 'POST') {
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
    return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: `Unhandled ${method} ${url}` } }), { status: 404 });
  });

  vi.spyOn(window, 'confirm').mockReturnValue(true);

  renderAdminPage(['/admin?tab=organizations']);

  expect(await screen.findByText('행복복지관')).toBeInTheDocument();

  // 1. 신규 기관 생성
  fireEvent.change(screen.getByLabelText('신규 기관 이름'), { target: { value: '새솔복지관' } });
  fireEvent.click(screen.getByRole('button', { name: '기관 코드 발급' }));

  const statusBanner = await screen.findByRole('status');
  expect(statusBanner).toHaveTextContent('새솔복지관');
  expect(statusBanner).toHaveTextContent('성공적으로 등록되었습니다');
  expect(statusBanner).toHaveTextContent('NEW003');

  // 2. 기관 수정 모달
  const editButtons = screen.getAllByRole('button', { name: '수정' });
  fireEvent.click(editButtons[0]);

  expect(screen.getByRole('heading', { name: '기관 정보 수정' })).toBeInTheDocument();
  const nameInput = screen.getByLabelText('기관 이름');
  fireEvent.change(nameInput, { target: { value: '행복복지관_수정' } });
  fireEvent.click(screen.getByRole('button', { name: '변경사항 저장' }));

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/admin\/organizations\/\d+/),
    expect.objectContaining({ method: 'PATCH' })
  );

  // 3. 기관 삭제
  const deleteButtons = screen.getAllByRole('button', { name: '삭제' });
  fireEvent.click(deleteButtons[1]);

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/admin\/organizations\/\d+/),
    expect.objectContaining({ method: 'DELETE' })
  );
});

it('사용자 목록에서 신규 사용자 등록 모달을 열고 사용자를 생성할 수 있다', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/api/admin/stats')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_STATS }), { status: 200 });
    }
    if (url.endsWith('/api/admin/users') && method === 'POST') {
      const newUser = {
        id: 3,
        name: '박신규',
        email: 'newuser@test.com',
        role: 'SUPPORT_WORKER',
        publicCode: 'W-3001',
        createdAt: '2026-10-21T10:00:00Z',
      };
      return new Response(JSON.stringify({ success: true, data: newUser }), { status: 201 });
    }
    if (url.includes('/api/admin/users')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_USERS }), { status: 200 });
    }
    if (url.includes('/api/admin/organizations')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_ORGS }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  renderAdminPage(['/admin?tab=users']);

  await screen.findByText('김보호');

  // 신규 사용자 등록 모달 오픈
  fireEvent.click(screen.getByRole('button', { name: '+ 신규 사용자 등록' }));
  expect(screen.getByRole('heading', { name: '신규 사용자 등록' })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '박신규' } });
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'newuser@test.com' } });
  fireEvent.change(screen.getByLabelText('초기 비밀번호 (6자 이상)'), { target: { value: 'Password123!' } });

  fireEvent.click(screen.getByRole('button', { name: '사용자 등록' }));

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/admin/users',
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('newuser@test.com'),
    })
  );
});

it('사용자 또는 기관의 기록 조회 버튼을 누르면 기록 조회 모달이 표시된다', async () => {
  const mockRecord = [
    {
      id: 101,
      careRecipientId: 5,
      careRecipientName: '홍돌봄',
      authorId: 2,
      authorName: '이지원',
      content: '오전 산책 및 간식 섭취 양호함',
      category: 'ACTIVITY',
      recordedAt: '2026-10-21T09:00:00Z',
      createdAt: '2026-10-21T09:05:00Z',
    },
  ];

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/api/admin/stats')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_STATS }), { status: 200 });
    }
    if (url.includes('/api/admin/users/2/records')) {
      return new Response(JSON.stringify({ success: true, data: mockRecord }), { status: 200 });
    }
    if (url.includes('/api/admin/users')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_USERS }), { status: 200 });
    }
    if (url.includes('/api/admin/organizations')) {
      return new Response(JSON.stringify({ success: true, data: MOCK_ORGS }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  renderAdminPage(['/admin?tab=users']);

  await screen.findByText('이지원');

  const recordButtons = screen.getAllByRole('button', { name: '기록 조회' });
  fireEvent.click(recordButtons[1]); // 이지원

  expect(await screen.findByText(/오전 산책 및 간식 섭취 양호함/)).toBeInTheDocument();
  expect(screen.getByText('활동/외출')).toBeInTheDocument();
});

it('더보기 탭으로 이동하면 관리자 정보 및 시스템 현황이 표시된다', async () => {
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
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  renderAdminPage();

  const moreTab = await screen.findByRole('tab', { name: '더보기' });
  fireEvent.click(moreTab);

  expect(await screen.findByText('관리자 계정 정보')).toBeInTheDocument();
  expect(screen.getByText('플랫폼 버전')).toBeInTheDocument();
  expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  expect(screen.getByText('정상 동작 중')).toBeInTheDocument();
});
