import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { AgencyDashboardPage } from './AgencyDashboardPage';
import { setTokenProvider } from '../../api/client';

import * as organizationsApi from '../../api/organizations';
import type { OrganizationGuardian } from '../../types/agency';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function(this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function(this: HTMLDialogElement) { this.open = false; });
});

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
  expect(screen.getByText(/이용자 #100/)).toBeInTheDocument();

  // '+ 배정하기' 버튼 클릭하여 모달 열기
  fireEvent.click(screen.getByRole('button', { name: '+ 배정하기' }));

  // 검색 인풋으로 대상자 검색 및 선택 확인
  const searchInput = screen.getByPlaceholderText('대상자 이름 또는 번호 검색…');
  fireEvent.change(searchInput, { target: { value: '김철수' } });

  // 당사자 드롭다운 및 지원사 드롭다운 선택, 배정 시작일 입력
  fireEvent.click(screen.getByRole('radio', { name: /김철수/ }));
  fireEvent.click(screen.getByRole('radio', { name: /이지원/ }));
  fireEvent.change(screen.getByLabelText('배정 시작일'), { target: { value: '2026-10-20' } });

  // 배정 제출
  fireEvent.click(screen.getByRole('button', { name: '배정 등록' }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/organizations/me/assignments', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"careRecipientId":200'),
    }));
  });

  expect(await screen.findByText(/김철수/)).toBeInTheDocument();
  expect(screen.getAllByText(/이지원/).length).toBeGreaterThanOrEqual(1);
});

function mockAssignmentPage(members: Array<{ id: number; userId: number; name: string; publicCode: string; status: string }>) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/api/organizations/me/members')) {
      return new Response(JSON.stringify({ success: true, data: members }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/recipients')) {
      return new Response(JSON.stringify({ success: true, data: [
        { id: 200, name: '김당사', careRecipientNumber: 'R-00000001', birthDate: '2000-01-01', gender: 'MALE' },
      ] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/guardians') || url.includes('/api/organizations/me/assignments')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: true, data: {
      id: 1, name: '희망 복지관', organizationCode: 'HOPE01',
    } }), { status: 200 });
  });
}

it('배정할 때 비활성 지원사는 선택지에서 제외하고 활성 지원사를 기본 선택한다', async () => {
  mockAssignmentPage([
    { id: 1, userId: 10, name: '비활성지원사', publicCode: 'S-INACTIVE', status: 'INACTIVE' },
    { id: 2, userId: 20, name: '활성지원사', publicCode: 'S-ACTIVE0', status: 'ACTIVE' },
  ]);
  renderWithProviders(['/agency?tab=assignments']);
  await screen.findByRole('heading', { level: 2, name: '희망 복지관' });
  fireEvent.click(screen.getByRole('button', { name: '+ 배정하기' }));

  expect(screen.getByRole('radio', { name: /활성지원사/ })).toBeChecked();
  expect(screen.queryByRole('radio', { name: /비활성지원사/ })).not.toBeInTheDocument();
});

it('활성 지원사가 없으면 배정할 수 없다고 안내하고 제출을 막는다', async () => {
  mockAssignmentPage([
    { id: 1, userId: 10, name: '비활성지원사', publicCode: 'S-INACTIVE', status: 'INACTIVE' },
  ]);
  renderWithProviders(['/agency?tab=assignments']);
  await screen.findByRole('heading', { level: 2, name: '희망 복지관' });
  fireEvent.click(screen.getByRole('button', { name: '+ 배정하기' }));

  expect(screen.getByText('활성 상태인 돌봄 지원사가 없습니다. 지원사를 활성화한 뒤 배정해 주세요.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '배정 등록' })).toBeDisabled();
});

it('진행 중인 배정에서 배정 종료 버튼을 클릭하면 배정을 종료하고 배정 기록 탭에서 확인된다', async () => {
  let ended = false;


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
      return new Response(JSON.stringify({
        success: true,
        data: [{ id: 100, name: '김삼결', careRecipientNumber: 'R-2026-001' }],
      }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/guardians')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/members')) {
      return new Response(JSON.stringify({
        success: true,
        data: [{ id: 2, userId: 2, name: '테스트 요양사', publicCode: 'S-V9DGQ9IJ', status: 'ACTIVE' }],
      }), { status: 200 });
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

  // 고유 코드 표기 확인
  await screen.findByText('김삼결 (R-2026-001)');
  expect(screen.getByText('테스트 요양사 (S-V9DGQ9IJ)')).toBeInTheDocument();

  const endBtn = screen.getByRole('button', { name: '배정 종료' });
  fireEvent.click(endBtn);
  fireEvent.click(screen.getByRole('alertdialog').querySelectorAll('button')[1]);

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/organizations/me/assignments/10/end', expect.objectContaining({
      method: 'PATCH',
    }));
  });

  // 배정이 종료되면 현황 탭에서는 사라짐
  await waitFor(() => {
    expect(screen.queryByRole('button', { name: '배정 종료' })).not.toBeInTheDocument();
  });

  // 배정 기록 탭으로 이동 시 종료된 항목 확인
  fireEvent.click(screen.getByRole('button', { name: /배정 기록/ }));
  expect(await screen.findByText('종료됨')).toBeInTheDocument();
  expect(screen.getByText('김삼결 (R-2026-001)')).toBeInTheDocument();
});

it('홈 대시보드에서 돌봄 보호자 등록 모달을 통해 보호자를 등록할 수 있다', async () => {
  let guardians: OrganizationGuardian[] = [
    { id: 1, guardianId: 10, name: '기존보호자', phone: '01011112222', publicCode: 'P-0001', createdAt: '2026-10-01', careRecipients: [] },
  ];

  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/api/organizations/me/guardians') && method === 'POST') {
      const created = {
        id: 2,
        guardianId: 20,
        name: '박새봄보호자',
        phone: '01099998888',
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

  fireEvent.change(screen.getByLabelText(/보호자 고유 코드/), { target: { value: '010-9999-8888' } });
  fireEvent.click(screen.getByRole('button', { name: '등록하기' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('보호자 고유 코드를 입력해 주세요.');
  expect(fetchMock.mock.calls.filter(([url, init]) => String(url).includes('/me/guardians') && init?.method === 'POST')).toHaveLength(0);

  fireEvent.change(screen.getByLabelText(/보호자 고유 코드/), { target: { value: 'p-abcdefgh' } });
  fireEvent.click(screen.getByRole('button', { name: '등록하기' }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/organizations/me/guardians', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ publicCode: 'P-ABCDEFGH' }),
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
      const created = { id: 2, userId: 20, name: '새지원사', publicCode: 'S-ABCDEFGH', status: 'ACTIVE' };
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

  fireEvent.change(screen.getByLabelText(/지원사 고유 코드/), { target: { value: '새지원사' } });
  fireEvent.click(screen.getByRole('button', { name: '추가하기' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('지원사 고유 코드를 입력해 주세요.');
  expect(fetchMock.mock.calls.filter(([url, init]) => String(url).includes('/me/members') && init?.method === 'POST')).toHaveLength(0);

  fireEvent.change(screen.getByLabelText(/지원사 고유 코드/), { target: { value: 's-abcdefgh' } });
  fireEvent.click(screen.getByRole('button', { name: '추가하기' }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/organizations/me/members', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ publicCode: 'S-ABCDEFGH' }),
    }));
  });

  expect(await screen.findByText('새지원사')).toBeInTheDocument();
});

it('홈 대시보드의 돌봄 대상자 현황에서 당사자를 등록한 돌봄 보호자 정보가 함께 표시된다', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);

    if (url.includes('/api/organizations/me/recipients')) {
      return new Response(JSON.stringify({
        success: true,
        data: [
          {
            id: 1,
            name: '김삼결',
            careRecipientNumber: 'R-TEST0001',
            birthDate: '2010-05-15',
            guardianName: '테스트 보호자',
            guardianPhone: '010-0000-0001',
          },
        ],
      }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/guardians')) {
      return new Response(JSON.stringify({
        success: true,
        data: [
          {
            id: 10,
            guardianId: 20,
            name: '테스트 보호자',
            phone: '010-0000-0001',
            careRecipients: [{ id: 1, name: '김삼결' }],
          },
        ],
      }), { status: 200 });
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

  // 당사자 정보 확인 (이름과 고유번호 분리)
  await screen.findByText('김삼결');
  expect(screen.getByText('(R-TEST0001)')).toBeInTheDocument();

  // 등록한 보호자 정보가 함께 렌더링되는지 확인
  expect(screen.getByText(/보호자: 테스트 보호자 \(010-0000-0001\)/)).toBeInTheDocument();
});

it('배정 종료 버튼 클릭 시 window.confirm이 호출되지 않고 ConfirmDialog가 표시된다', async () => {
  HTMLDialogElement.prototype.showModal = vi.fn(function(this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function(this: HTMLDialogElement) { this.open = false; });
  const confirmSpy = vi.spyOn(window, 'confirm');

  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = String(input);
    if (url.includes('/api/organizations/me/assignments')) {
      return new Response(JSON.stringify({
        success: true,
        data: [{ id: 10, organizationId: 1, careRecipientId: 100, supportWorkerId: 2, startDate: '2026-10-01', endDate: null, endedAt: null }],
      }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/recipients')) return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    if (url.includes('/api/organizations/me/members')) {
      return new Response(JSON.stringify({
        success: true,
        data: [{ id: 2, userId: 2, name: '이지원', publicCode: 'SW-001', status: 'ACTIVE' }],
      }), { status: 200 });
    }
    if (url.includes('/api/organizations/me')) return new Response(JSON.stringify({ success: true, data: { id: 1, name: '희망 복지관', organizationCode: 'HOPE01' } }), { status: 200 });
    return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
  });

  renderWithProviders(['/agency?tab=assignments']);
  await screen.findByText(/이용자 #100/);

  fireEvent.click(screen.getByRole('button', { name: '배정 종료' }));

  expect(confirmSpy).not.toHaveBeenCalled();
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
});

it('기관은 고유 코드로 연결한 지원사 계정의 이름과 전화번호를 수정할 수 없다', async () => {
  vi.spyOn(organizationsApi, 'getMyOrganization').mockResolvedValue({ id: 1, name: '예시 기관', organizationCode: 'ABC123' } as any);
  vi.spyOn(organizationsApi, 'getMembers').mockResolvedValue([{ id: 2, userId: 2, name: '기존 지원사', phone: '010-0000-0000', status: 'ACTIVE' }] as any);
  vi.spyOn(organizationsApi, 'getAssignments').mockResolvedValue([]);
  vi.spyOn(organizationsApi, 'getOrganizationRecipients').mockResolvedValue([]);
  vi.spyOn(organizationsApi, 'getOrganizationGuardians').mockResolvedValue([]);
  renderWithProviders(['/agency?tab=workers']);
  expect(await screen.findByText('기존 지원사')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '비활성화' })).toBeInTheDocument();
});

it('지원사 관리 목록에서 프로필을 열어 특성을 저장한다', async () => {
  vi.spyOn(organizationsApi, 'getMyOrganization').mockResolvedValue({ id: 1, name: '예시 기관', organizationCode: 'ABC123' } as any);
  vi.spyOn(organizationsApi, 'getMembers').mockResolvedValue([
    { id: 2, userId: 2, name: '기존 지원사', publicCode: 'S-ABCDEFGH', status: 'ACTIVE', joinedAt: '2026-09-01T09:00:00' },
  ] as any);
  vi.spyOn(organizationsApi, 'getAssignments').mockResolvedValue([]);
  vi.spyOn(organizationsApi, 'getOrganizationRecipients').mockResolvedValue([]);
  vi.spyOn(organizationsApi, 'getOrganizationGuardians').mockResolvedValue([]);
  const saveCharacteristics = vi.spyOn(organizationsApi, 'updateMemberCharacteristics')
    .mockResolvedValue({ id: 2, userId: 2, name: '기존 지원사', publicCode: 'S-ABCDEFGH', status: 'ACTIVE', joinedAt: '2026-09-01T09:00:00', characteristics: '간결한 안내를 선호합니다.' } as any);

  renderWithProviders(['/agency?tab=workers']);
  await screen.findByText('기존 지원사');
  fireEvent.click(screen.getByRole('button', { name: '기존 지원사 프로필 보기' }));

  const dialog = screen.getByRole('dialog', { name: '돌봄 지원사 프로필' });
  fireEvent.change(within(dialog).getByLabelText(/기관 내 인수인계/), { target: { value: '간결한 안내를 선호합니다.' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '특성 저장' }));

  await waitFor(() => expect(saveCharacteristics).toHaveBeenCalledWith(2, '간결한 안내를 선호합니다.'));
});

it('특성 저장 실패 메시지를 지원사 프로필 다이얼로그 안에 표시한다', async () => {
  vi.spyOn(organizationsApi, 'getMyOrganization').mockResolvedValue({ id: 1, name: '예시 기관', organizationCode: 'ABC123' } as any);
  vi.spyOn(organizationsApi, 'getMembers').mockResolvedValue([
    { id: 2, userId: 2, name: '기존 지원사', publicCode: 'S-ABCDEFGH', status: 'ACTIVE', joinedAt: '2026-09-01T09:00:00' },
  ] as any);
  vi.spyOn(organizationsApi, 'getAssignments').mockResolvedValue([]);
  vi.spyOn(organizationsApi, 'getOrganizationRecipients').mockResolvedValue([]);
  vi.spyOn(organizationsApi, 'getOrganizationGuardians').mockResolvedValue([]);
  vi.spyOn(organizationsApi, 'updateMemberCharacteristics').mockRejectedValue(new Error('특성 저장 실패'));

  renderWithProviders(['/agency?tab=workers']);
  await screen.findByText('기존 지원사');
  fireEvent.click(screen.getByRole('button', { name: '기존 지원사 프로필 보기' }));
  const dialog = screen.getByRole('dialog', { name: '돌봄 지원사 프로필' });
  fireEvent.click(within(dialog).getByRole('button', { name: '특성 저장' }));

  expect(await within(dialog).findByRole('alert')).toHaveTextContent('특성 저장 실패');
});

function seoulDate(offsetDays: number) {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

function mockAssignmentPageWithAssignments() {
  const assign = (id: number, recipientId: number, worker: number, start: string, end: string | null, endedAt: string | null) => ({
    id, organizationId: 1, careRecipientId: recipientId, supportWorkerId: worker,
    startDate: start, endDate: end, endedAt, createdAt: '2026-10-01T00:00:00',
  });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/api/organizations/me/members')) {
      return new Response(JSON.stringify({ success: true, data: [
        { id: 1, userId: 20, name: '활성지원사A', publicCode: 'S-ACTIVE0', status: 'ACTIVE', joinedAt: '2026-09-01T09:00:00' },
        { id: 2, userId: 30, name: '활성지원사B', publicCode: 'S-ACTIVE1', status: 'ACTIVE', joinedAt: '2026-09-15T09:00:00' },
      ] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/recipients')) {
      return new Response(JSON.stringify({ success: true, data: [200, 201, 202, 203, 204].map(id => (
        { id, name: `당사자${id}`, careRecipientNumber: `R-${id}`, birthDate: '2000-01-01', gender: 'MALE' })) }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/assignments')) {
      return new Response(JSON.stringify({ success: true, data: [
        assign(1, 200, 20, seoulDate(-1), null, null),                       // 진행 중
        assign(2, 201, 20, seoulDate(0), seoulDate(1), null),                // 진행 중 (오늘 시작, 내일 종료)
        assign(3, 202, 20, seoulDate(-10), null, '2026-10-20T00:00:00'),     // 종료됨
        assign(4, 203, 20, seoulDate(1), null, null),                        // 내일 시작
        assign(5, 204, 20, seoulDate(-10), seoulDate(-1), null),             // 종료일 지남
        assign(6, 200, 20, seoulDate(-3), null, null),                       // 같은 당사자 중복 배정
      ] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/guardians')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: true, data: { id: 1, name: '희망 복지관', organizationCode: 'HOPE01' } }), { status: 200 });
  });
}

it('지원사 선택 목록에 고유번호와 현재 담당 중인 당사자 수를 표시한다', async () => {
  mockAssignmentPageWithAssignments();
  renderWithProviders(['/agency?tab=assignments']);
  await screen.findByRole('heading', { level: 2, name: '희망 복지관' });
  fireEvent.click(screen.getByRole('button', { name: '+ 배정하기' }));

  expect(screen.getByRole('radio', { name: /활성지원사A.*S-ACTIVE0.*담당 2명/ })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /활성지원사B.*S-ACTIVE1.*담당 0명/ })).toBeInTheDocument();
});

it('프로필 보기를 누르면 지원사 상세와 현재 담당 당사자를 보여주고 선택은 바뀌지 않는다', async () => {
  mockAssignmentPageWithAssignments();
  renderWithProviders(['/agency?tab=assignments']);
  await screen.findByRole('heading', { level: 2, name: '희망 복지관' });
  fireEvent.click(screen.getByRole('button', { name: '+ 배정하기' }));
  expect(screen.getByRole('radio', { name: /활성지원사A/ })).toBeChecked();

  fireEvent.click(screen.getByRole('button', { name: '활성지원사B 프로필 보기' }));

  const dialog = screen.getByRole('dialog', { name: '돌봄 지원사 프로필' });
  expect(within(dialog).getByText('활성지원사B')).toBeInTheDocument();
  expect(within(dialog).getByText('S-ACTIVE1')).toBeInTheDocument();
  expect(within(dialog).getByText('담당 중인 당사자가 없어요.')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /활성지원사A/ })).toBeChecked();

  fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
  expect(screen.queryByRole('dialog', { name: '돌봄 지원사 프로필' })).not.toBeInTheDocument();
});

it('지원사 프로필에는 현재 담당 중인 당사자만 이름과 고유번호로 보여준다', async () => {
  mockAssignmentPageWithAssignments();
  renderWithProviders(['/agency?tab=assignments']);
  await screen.findByRole('heading', { level: 2, name: '희망 복지관' });
  fireEvent.click(screen.getByRole('button', { name: '+ 배정하기' }));

  fireEvent.click(screen.getByRole('button', { name: '활성지원사A 프로필 보기' }));

  const dialog = screen.getByRole('dialog', { name: '돌봄 지원사 프로필' });
  expect(within(dialog).getByText(/당사자200/)).toBeInTheDocument();
  expect(within(dialog).getByText(/당사자201/)).toBeInTheDocument();
  expect(within(dialog).queryByText(/당사자202/)).not.toBeInTheDocument();
  expect(within(dialog).queryByText(/당사자203/)).not.toBeInTheDocument();
  expect(within(dialog).queryByText(/당사자204/)).not.toBeInTheDocument();
});

type RecipientFixture = Record<string, unknown>;

function mockRecipientProfilePage(
  recipients: RecipientFixture[],
  routines: Record<number, Array<{ id: number; time: string; title: string; memo: string | null }> | 'error'>,
) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const routineMatch = url.match(/\/api\/care-recipients\/(\d+)\/routines/);
    if (routineMatch) {
      const result = routines[Number(routineMatch[1])] ?? [];
      if (result === 'error') return new Response(JSON.stringify({ success: false, error: { code: 'X', message: 'fail' } }), { status: 500 });
      return new Response(JSON.stringify({ success: true, data: result.map(r => ({ ...r, careRecipientId: Number(routineMatch[1]) })) }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/members')) {
      return new Response(JSON.stringify({ success: true, data: [
        { id: 1, userId: 20, name: '활성지원사A', publicCode: 'S-ACTIVE0', status: 'ACTIVE', joinedAt: '2026-09-01T09:00:00' },
      ] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/recipients')) {
      return new Response(JSON.stringify({ success: true, data: recipients }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/guardians') || url.includes('/api/organizations/me/assignments')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: true, data: { id: 1, name: '희망 복지관', organizationCode: 'HOPE01' } }), { status: 200 });
  });
}

const fullRecipient: RecipientFixture = {
  id: 201, name: '이영희', careRecipientNumber: 'R-0003', birthDate: '2012-03-08', gender: 'FEMALE',
  disabilityTypes: ['AUTISM', 'OTHER'], otherDisabilityType: '뇌병변', disabilitySeverity: 'SEVERE',
  hospitalName: '삼결병원', doctorName: '김의사', hospitalPhone: '053-000-0000',
  supportCenterName: '행복센터', supportCenterManagerName: '박담당', supportCenterPhone: '053-111-1111',
  guardianName: '박보호', guardianPhone: '010-1234-5678',
};
const plainRecipient: RecipientFixture = {
  id: 200, name: '김철수', careRecipientNumber: 'R-0002', birthDate: '2000-01-01', gender: 'MALE',
};

async function openAssignModal() {
  renderWithProviders(['/agency?tab=assignments']);
  await screen.findByRole('heading', { level: 2, name: '희망 복지관' });
  fireEvent.click(screen.getByRole('button', { name: '+ 배정하기' }));
}

it('당사자 선택 목록에 고유번호를 표시하고 이름·번호로 검색할 수 있다', async () => {
  mockRecipientProfilePage([plainRecipient, fullRecipient], {});
  await openAssignModal();

  expect(screen.getByRole('radio', { name: /김철수.*R-0002/ })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /이영희.*R-0003/ })).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText('대상자 이름 또는 번호 검색…'), { target: { value: 'R-0003' } });
  expect(screen.queryByRole('radio', { name: /김철수/ })).not.toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /이영희/ })).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText('대상자 이름 또는 번호 검색…'), { target: { value: '없는사람' } });
  expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
});

it('당사자 프로필 보기를 누르면 상세 정보와 루틴을 보여주고 선택은 바뀌지 않는다', async () => {
  mockRecipientProfilePage([plainRecipient, fullRecipient], {
    201: [
      { id: 1, time: '07:30', title: '기상', memo: '천천히' },
      { id: 2, time: '19:00', title: '저녁 식사', memo: null },
    ],
  });
  await openAssignModal();
  expect(screen.getByRole('radio', { name: /김철수/ })).toBeChecked();

  fireEvent.click(screen.getByRole('button', { name: '이영희 프로필 보기' }));

  const dialog = await screen.findByRole('dialog', { name: '돌봄 당사자 프로필' });
  expect(within(dialog).getByText('이영희')).toBeInTheDocument();
  expect(within(dialog).getByText('R-0003')).toBeInTheDocument();
  expect(within(dialog).getByText('2012-03-08 (여)')).toBeInTheDocument();
  expect(within(dialog).getByText(/자폐성 장애/)).toBeInTheDocument();
  expect(within(dialog).getByText(/뇌병변/)).toBeInTheDocument();
  expect(within(dialog).getByText('심한 장애')).toBeInTheDocument();
  expect(within(dialog).getByText('삼결병원 · 김의사 · 053-000-0000')).toBeInTheDocument();
  expect(within(dialog).getByText('행복센터 · 박담당 · 053-111-1111')).toBeInTheDocument();
  expect(within(dialog).getByText('박보호 (010-1234-5678)')).toBeInTheDocument();

  const items = await within(dialog).findAllByRole('listitem');
  expect(items[0].textContent).toContain('07:30');
  expect(items[0].textContent).toContain('기상');
  expect(items[0].textContent).toContain('천천히');
  expect(items[1].textContent).toContain('19:00');

  expect(screen.getByRole('radio', { name: /김철수/ })).toBeChecked();
  fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
  expect(screen.queryByRole('dialog', { name: '돌봄 당사자 프로필' })).not.toBeInTheDocument();
});

it('당사자 프로필에 입력된 정보가 없으면 안내 문구를 보여준다', async () => {
  mockRecipientProfilePage([plainRecipient], { 200: [] });
  await openAssignModal();

  fireEvent.click(screen.getByRole('button', { name: '김철수 프로필 보기' }));

  const dialog = await screen.findByRole('dialog', { name: '돌봄 당사자 프로필' });
  expect(within(dialog).getAllByText('등록된 정보가 없어요.').length).toBeGreaterThanOrEqual(3);
  expect(await within(dialog).findByText('등록된 루틴이 없어요.')).toBeInTheDocument();
});

it('루틴을 불러오지 못해도 당사자 프로필은 보여주고 오류를 안내한다', async () => {
  mockRecipientProfilePage([fullRecipient], { 201: 'error' });
  await openAssignModal();

  fireEvent.click(screen.getByRole('button', { name: '이영희 프로필 보기' }));

  const dialog = await screen.findByRole('dialog', { name: '돌봄 당사자 프로필' });
  expect(within(dialog).getByText('이영희')).toBeInTheDocument();
  expect(await within(dialog).findByText('루틴을 불러오지 못했어요.')).toBeInTheDocument();
});

it('홈 대시보드에 처리할 연결 요청이 보이고 수락하면 대시보드 데이터를 다시 불러온다', async () => {
  let accepted = false;
  let guardianLoads = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const ok = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200 });
    if (url.endsWith('/api/organizations/me')) return ok({ id: 1, name: '희망 복지관', organizationCode: 'KNU001', createdAt: '2026-10-01T00:00:00' });
    if (url.endsWith('/api/organizations/me/guardians')) {
      guardianLoads += 1;
      return ok([]);
    }
    if (url.endsWith('/api/organizations/me/link-requests')) {
      return ok(accepted ? [] : [{
        id: 11, organizationId: 1, careRecipientId: 100, careRecipientName: '김하늘', careRecipientNumber: 'R-ABCD1234',
        requestedById: 5, requestedByName: '박보호', requestedByPublicCode: 'P-AAAA1111',
        status: 'PENDING', requestedAt: '2026-11-03T01:00:00', decidedAt: null,
      }]);
    }
    if (url.endsWith('/organization-link-requests/11/accept') && method === 'POST') {
      accepted = true;
      return ok(null);
    }
    return ok([]);
  });

  renderWithProviders();

  expect(await screen.findByRole('heading', { name: '연결 요청 (1건)' })).toBeInTheDocument();
  const loadsBefore = guardianLoads;
  const item = screen.getByText('김하늘').closest('li') as HTMLElement;
  fireEvent.click(within(item).getByRole('button', { name: '수락' }));

  await waitFor(() => expect(guardianLoads).toBeGreaterThan(loadsBefore));
  expect(await screen.findByText('처리할 연결 요청이 없어요.')).toBeInTheDocument();
});
