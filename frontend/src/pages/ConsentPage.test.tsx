import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setTokenProvider } from '../api/client';
import { ConsentPage } from './ConsentPage';

beforeEach(() => {
  sessionStorage.clear();
  setTokenProvider(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

function renderConsentPage() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ConsentPage />} />
        <Route path="/login" element={<h1>로그인 화면</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

function agreeToRequiredItems() {
  for (const checkbox of screen.getAllByRole('checkbox', { name: /필수/ })) {
    fireEvent.click(checkbox);
  }
}

it('필수 동의가 빠지면 제출할 수 없다', () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch');
  renderConsentPage();
  fireEvent.click(screen.getAllByRole('checkbox', { name: /필수/ })[0]);
  const submit = screen.getByRole('button', { name: '동의하고 시작하기' });
  expect(submit).toBeDisabled();
  fireEvent.click(submit);
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([false, true])('동의와 약관 버전을 전송하고 티켓 저장 후 로그인으로 이동한다 (마케팅: %s)', async marketing => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ success: true, data: { consentTicket: 'test-consent-ticket' } })),
  );
  renderConsentPage();
  agreeToRequiredItems();
  if (marketing) fireEvent.click(screen.getByRole('checkbox', { name: /선택/ }));
  fireEvent.click(screen.getByRole('button', { name: '동의하고 시작하기' }));

  await screen.findByRole('heading', { name: '로그인 화면' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/auth/consent`);
  expect(options?.method).toBe('POST');
  expect(JSON.parse(options?.body as string)).toEqual({
    basicInfo: true,
    sensitiveInfo: true,
    caregiverShare: true,
    marketing,
    termsVersion: '1.0',
  });
  expect(sessionStorage.getItem('consentTicket')).toBe('test-consent-ticket');
});

it('동의 API가 실패하면 티켓을 저장하거나 이동하지 않고 재시도를 허용한다', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '테스트 오류' },
  }), { status: 500 }));
  renderConsentPage();
  agreeToRequiredItems();
  fireEvent.click(screen.getByRole('button', { name: '동의하고 시작하기' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('동의 처리 중 오류가 발생했어요. 다시 시도해주세요.');
  expect(sessionStorage.getItem('consentTicket')).toBeNull();
  expect(screen.queryByRole('heading', { name: '로그인 화면' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '동의하고 시작하기' })).toBeEnabled();
});
