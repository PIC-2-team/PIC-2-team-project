import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { AgencyDashboardPage } from './AgencyDashboardPage';
import { setTokenProvider } from '../../api/client';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setTokenProvider(() => null);
});

function renderWithProviders() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <AgencyDashboardPage />
      </MemoryRouter>
    </AuthProvider>,
  );
}

it('기관이 등록되어 있지 않은 경우 (404) 기관 등록 온보딩 폼을 표시한다', async () => {
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
  expect(screen.getByLabelText('기관 이름')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '기관 등록' })).toBeInTheDocument();
  expect(screen.queryByText('기관을 찾을 수 없습니다.')).not.toBeInTheDocument();
});

it('기관 등록 폼을 제출하면 기관을 생성하고 대시보드를 갱신한다', async () => {
  let created = false;
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/api/organizations/me/members')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.includes('/api/organizations/me/assignments')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }
    if (url.endsWith('/api/organizations') && method === 'POST') {
      created = true;
      return new Response(JSON.stringify({
        success: true,
        data: { id: 1, name: '희망 복지관', organizationCode: 'HOPE1234' },
      }), { status: 201 });
    }
    if (url.includes('/api/organizations/me')) {
      if (!created) {
        return new Response(JSON.stringify({
          success: false,
          error: { code: 'ORGANIZATION_NOT_FOUND', message: '기관을 찾을 수 없습니다.' },
        }), { status: 404 });
      }
      return new Response(JSON.stringify({
        success: true,
        data: { id: 1, name: '희망 복지관', organizationCode: 'HOPE1234' },
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true, data: null }), { status: 200 });
  });

  renderWithProviders();

  await screen.findByText('소속 기관을 등록해 주세요');

  fireEvent.change(screen.getByLabelText('기관 이름'), { target: { value: '희망 복지관' } });
  fireEvent.click(screen.getByRole('button', { name: '기관 등록' }));

  await screen.findByRole('heading', { level: 2, name: '희망 복지관' });
  expect(screen.getByText('기관 코드: HOPE1234')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/organizations', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ name: '희망 복지관' }),
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
        error: { code: 'CONFLICT', message: '이미 등록된 기관입니다.' },
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

  fireEvent.change(screen.getByLabelText('기관 이름'), { target: { value: '중복 복지관' } });
  fireEvent.click(screen.getByRole('button', { name: '기관 등록' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('이미 등록된 기관입니다.');
  expect(screen.getByText('소속 기관을 등록해 주세요')).toBeInTheDocument();
});
