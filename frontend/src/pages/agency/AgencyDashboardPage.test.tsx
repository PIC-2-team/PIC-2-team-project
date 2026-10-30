import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  expect(await screen.findByText(/김철수/)).toBeInTheDocument();
  expect(screen.getAllByText(/이지원/).length).toBeGreaterThanOrEqual(1);
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
