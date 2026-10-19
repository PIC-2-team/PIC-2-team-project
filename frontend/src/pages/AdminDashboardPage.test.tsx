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
