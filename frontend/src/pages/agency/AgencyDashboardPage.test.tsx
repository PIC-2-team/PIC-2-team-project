import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { AgencyDashboardPage } from './AgencyDashboardPage';
import { setTokenProvider } from '../../api/client';

import type { OrganizationGuardian } from '../../types/agency';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setTokenProvider(() => null);
});

function renderWithProviders(initialEntries: string[] = ['/agency']) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <AgencyDashboardPage />
      </MemoryRouter>
    </AuthProvider>,
  );
}

it('기관이 등록되어 있지 않은 경우 (404) 기관 코드 등록 온보딩 폼을 표시한다', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/api/organizations/me')) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'ORGANIZATION_NOT_FOUND', message: '기관을 찾을 수 없습니다.' },
      }), { status: 404 });
    }
    return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
  });

  renderWithProviders();

  expect(await screen.findByText('소속 기관을 등록해 주세요')).toBeInTheDocument();
  expect(screen.getByLabelText('기관 코드 (6자리)')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '기관 등록하기' })).toBeInTheDocument();
  expect(screen.queryByText('기관을 찾을 수 없습니다.')).not.toBeInTheDocument();
});

it('6자리 기관 코드 폼을 제출하면 기관을 등록하고 대시보드를 갱신한다', async () => {
  let registered = false;
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/api/organizations/me/members')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/recipients')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/guardians')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/assignments')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.endsWith('/api/organizations') && method === 'POST') {
      registered = true;
      return new Response(JSON.stringify({
        success: true,
        data: { id: 1, name: '희망 복지관', organizationCode: 'KNU001' },
      }), { status: 201 });
    }
    if (url.includes('/api/organizations/me')) {
      if (!registered) {
        return new Response(JSON.stringify({
          success: false,
          error: { code: 'ORGANIZATION_NOT_FOUND', message: '기관을 찾을 수 없습니다.' },
        }), { status: 404 });
      }
      return new Response(JSON.stringify({
        success: true,
        data: { id: 1, name: '희망 복지관', organizationCode: 'KNU001' },
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true, data: null }), { status: 200 });
  });

  renderWithProviders();

  await screen.findByText('소속 기관을 등록해 주세요');

  fireEvent.change(screen.getByLabelText('기관 코드 (6자리)'), { target: { value: 'knu001' } });
  fireEvent.click(screen.getByRole('button', { name: '기관 등록하기' }));

  await screen.findByRole('heading', { level: 2, name: '희망 복지관' });
  expect(screen.getByText(/기관 코드:/)).toHaveTextContent('KNU001');
  expect(fetchMock).toHaveBeenCalledWith('/api/organizations', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ organizationCode: 'KNU001' }),
  }));
});

it('404가 아닌 일반 오류인 경우 에러 메시지를 표시한다', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: '서버 내부 오류가 발생했습니다.' },
    }), { status: 500 });
  });

  renderWithProviders();

  expect(await screen.findByRole('alert')).toHaveTextContent('서버 내부 오류가 발생했습니다.');
  expect(screen.queryByText('소속 기관을 등록해 주세요')).not.toBeInTheDocument();
});

it('기관 등록 요청이 실패하면 온보딩 폼 내에 에러 메시지를 표시한다', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/api/organizations') && method === 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'CONFLICT', message: '이미 등록된 기관 코드입니다.' },
      }), { status: 409 });
    }
    if (url.includes('/api/organizations/me')) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'ORGANIZATION_NOT_FOUND', message: '기관을 찾을 수 없습니다.' },
      }), { status: 404 });
    }
    return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
  });

  renderWithProviders();

  await screen.findByText('소속 기관을 등록해 주세요');

  fireEvent.change(screen.getByLabelText('기관 코드 (6자리)'), { target: { value: 'DUP001' } });
  fireEvent.click(screen.getByRole('button', { name: '기관 등록하기' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('이미 등록된 기관 코드입니다.');
  expect(screen.getByText('소속 기관을 등록해 주세요')).toBeInTheDocument();
});

it('배정 탭에서 등록된 대상자와 돌봄 지원사를 검색/선택하여 배정하면 배정 목록이 갱신된다', async () => {
  let assignmentsList = [
    { id: 10, organizationId: 1, careRecipientId: 100, supportWorkerId: 2, startDate: '2026-10-01', endDate: null, endedAt: null },
  ];

  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/api/organizations/me/members')) {
      return new Response(JSON.stringify({
        success: true,
        data: [{ id: 2, userId: 2, name: '이지원', publicCode: 'SW-001', status: 'ACTIVE' }],
      }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/recipients')) {
      return new Response(JSON.stringify({
        success: true,
        data: [{ id: 200, name: '김철수', careRecipientNumber: 'P-0002', birthDate: '2000-01-01', gender: 'MALE' }],
      }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/guardians')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/assignments') && method === 'POST') {
      const newAssign = {
        id: 11,
        organizationId: 1,
        careRecipientId: 200,
        supportWorkerId: 2,
        startDate: '2026-10-20',
        endDate: null,
        endedAt: null,
      };
      assignmentsList = [...assignmentsList, newAssign];
      return new Response(JSON.stringify({ success: true, data: newAssign }), { status: 201 });
    }
    if (url.includes('/api/organizations/me/assignments')) {
      return new Response(JSON.stringify({ success: true, data: assignmentsList }), { status: 200 });
    }
    if (url.includes('/api/organizations/me')) {
      return new Response(JSON.stringify({
        success: true,
        data: { id: 1, name: '희망 복지관', organizationCode: 'HOPE01' },
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
  });

  renderWithProviders(['/agency?tab=assignments']);

  await screen.findByRole('heading', { level: 2, name: '희망 복지관' });
  expect(screen.getByText('이용자 #100')).toBeInTheDocument();

  // '+ 배정하기' 버튼 클릭하여 모달 열기
  fireEvent.click(screen.getByRole('button', { name: '+ 배정하기' }));

  // 검색 인풋으로 대상자 검색 및 선택 확인
  const searchInput = screen.getByPlaceholderText('대상자 이름 또는 번호 검색…');
  fireEvent.change(searchInput, { target: { value: '김철수' } });

  // 당사자 드롭다운 및 지원사 드롭다운 선택, 배정 시작일 입력
  fireEvent.change(screen.getByLabelText('돌봄 대상자'), { target: { value: '200' } });
  fireEvent.change(screen.getByLabelText('돌봄 지원사'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('배정 시작일'), { target: { value: '2026-10-20' } });

  // 배정 제출
  fireEvent.click(screen.getByRole('button', { name: '배정 등록' }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/organizations/me/assignments', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"careRecipientId":200'),
    }));
  });

  expect(await screen.findByText('김철수 (#200)')).toBeInTheDocument();
  expect(screen.getAllByText(/이지원 \(#2\)/).length).toBeGreaterThanOrEqual(1);
});

it('진행 중인 배정에서 배정 종료 버튼을 클릭하면 배정을 종료한다', async () => {
  let ended = false;
  vi.spyOn(window, 'confirm').mockReturnValue(true);

  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/api/organizations/me/assignments/10/end') && method === 'PATCH') {
      ended = true;
      return new Response(JSON.stringify({ success: true, data: null }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/assignments')) {
      return new Response(JSON.stringify({
        success: true,
        data: [
          {
            id: 10,
            organizationId: 1,
            careRecipientId: 100,
            supportWorkerId: 2,
            startDate: '2026-10-01',
            endDate: null,
            endedAt: ended ? '2026-10-20T12:00:00Z' : null,
          },
        ],
      }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/recipients')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/guardians')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/members')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me')) {
      return new Response(JSON.stringify({
        success: true,
        data: { id: 1, name: '희망 복지관', organizationCode: 'HOPE01' },
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
  });

  renderWithProviders(['/agency?tab=assignments']);

  await screen.findByText('이용자 #100');

  const endBtn = screen.getByRole('button', { name: '배정 종료' });
  fireEvent.click(endBtn);

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/organizations/me/assignments/10/end', expect.objectContaining({
      method: 'PATCH',
    }));
  });

  expect(await screen.findByText('종료됨')).toBeInTheDocument();
});

it('홈 대시보드에서 돌봄 보호자 등록 모달을 통해 보호자를 등록할 수 있다', async () => {
  let guardians: OrganizationGuardian[] = [
    { id: 1, guardianId: 10, name: '기존보호자', publicCode: 'P-0001', createdAt: '2026-10-01', careRecipients: [] },
  ];

  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/api/organizations/me/guardians') && method === 'POST') {
      const created = {
        id: 2,
        guardianId: 20,
        name: '박새봄보호자',
        publicCode: 'P-9999',
        createdAt: '2026-10-22',
        careRecipients: [{ id: 1, name: '박당사', careRecipientNumber: 'R-001' }],
      };
      guardians = [...guardians, created];
      return new Response(JSON.stringify({ success: true, data: created }), { status: 201 });
    }
    if (url.includes('/api/organizations/me/guardians')) {
      return new Response(JSON.stringify({ success: true, data: guardians }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/recipients')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/members')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/assignments')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me')) {
      return new Response(JSON.stringify({
        success: true,
        data: { id: 1, name: '희망 복지관', organizationCode: 'HOPE01' },
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
  });

  renderWithProviders(['/agency']);

  await screen.findByText('기존보호자');

  // + 보호자 등록 버튼 클릭
  fireEvent.click(screen.getByRole('button', { name: '+ 보호자 등록' }));

  // 식별 코드 입력
  fireEvent.change(screen.getByLabelText(/보호자 식별 코드/), { target: { value: 'P-9999' } });
  fireEvent.click(screen.getByRole('button', { name: '등록하기' }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/organizations/me/guardians', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ guardianCodeOrEmail: 'P-9999' }),
    }));
  });

  expect(await screen.findByText('박새봄보호자')).toBeInTheDocument();
  expect(screen.getByText(/박당사/)).toBeInTheDocument();
});

it('돌봄 지원사 관리 탭에서 지원사를 추가할 수 있다', async () => {
  let members = [
    { id: 1, userId: 1, name: '기존지원사', publicCode: 'SW-001', status: 'ACTIVE' },
  ];

  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/api/organizations/me/members') && method === 'POST') {
      const created = { id: 2, userId: 20, name: '새지원사', publicCode: 'SW-002', status: 'ACTIVE' };
      members = [...members, created];
      return new Response(JSON.stringify({ success: true, data: created }), { status: 201 });
    }
    if (url.includes('/api/organizations/me/members')) {
      return new Response(JSON.stringify({ success: true, data: members }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/recipients')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/guardians')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/assignments')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me')) {
      return new Response(JSON.stringify({
        success: true,
        data: { id: 1, name: '희망 복지관', organizationCode: 'HOPE01' },
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
  });

  renderWithProviders(['/agency?tab=workers']);

  await screen.findByText('기존지원사');

  // + 지원사 추가 버튼 클릭
  fireEvent.click(screen.getByRole('button', { name: '+ 지원사 추가' }));

  // 사용자 ID 입력
  fireEvent.change(screen.getByLabelText(/지원사 사용자 ID/), { target: { value: '20' } });
  fireEvent.click(screen.getByRole('button', { name: '추가하기' }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/organizations/me/members', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ userId: 20 }),
    }));
  });

  expect(await screen.findByText('새지원사')).toBeInTheDocument();
});
