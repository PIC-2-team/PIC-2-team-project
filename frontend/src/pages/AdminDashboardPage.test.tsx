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
    { id: 1, name: '김보호', email: 'guardian1@test.com', role: 'GUARDIAN', publicCode: 'G-1001', createdAt: '2026-10-15T09:30:00Z' },
    { id: 2, name: '이지원', email: 'worker1@test.com', role: 'SUPPORT_WORKER', publicCode: 'W-2001', createdAt: '2026-10-16T11:20:00Z' },
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

  // 사용자 목록 탭으로 전환
  fireEvent.click(userTab);

  expect(await screen.findByText('김보호')).toBeInTheDocument();
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
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  renderAdminPage(['/admin?tab=users']);

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
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  });

  renderAdminPage(['/admin?tab=organizations']);

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

it('하단바 탭 클릭 시 대시보드, 기관 관리, 사용자 목록 화면이 전환된다', async () => {
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

  // 기본 탭: 대시보드(통계)
  expect(await screen.findByText('서비스 통계')).toBeInTheDocument();
  expect(screen.queryByLabelText('신규 기관 이름')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('역할 필터')).not.toBeInTheDocument();

  // 기관 관리 탭 클릭
  const orgTab = await screen.findByRole('tab', { name: /기관 관리/ });
  fireEvent.click(orgTab);
  expect(await screen.findByLabelText('신규 기관 이름')).toBeInTheDocument();
  expect(screen.queryByText('서비스 통계')).not.toBeInTheDocument();

  // 사용자 목록 탭 클릭
  const userTab = screen.getByRole('tab', { name: /사용자 목록/ });
  fireEvent.click(userTab);
  expect(await screen.findByLabelText('역할 필터')).toBeInTheDocument();
  expect(screen.queryByLabelText('신규 기관 이름')).not.toBeInTheDocument();
});
