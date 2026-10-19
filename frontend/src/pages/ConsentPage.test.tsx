import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setTokenProvider } from '../api/client';
import { ConsentPage } from './ConsentPage';

type PendingGoogle = { pendingToken: string; email: string; name: string };

beforeEach(() => {
  sessionStorage.clear();
  setTokenProvider(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

function renderConsentPage(options?: { pendingGoogle?: PendingGoogle }) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/', state: options }]}>
      <Routes>
        <Route path="/" element={<ConsentPage />} />
        <Route path="/login" element={<h1>로그인 화면</h1>} />
        <Route path="/register" element={<h1>로그인 화면</h1>} />
        <Route path="/google-register" element={<h1>구글 가입 화면</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** 보호자 역할 선택 후 동의 단계로 이동 */
function goToConsentStep() {
  fireEvent.click(screen.getByRole('radio', { name: /돌봄 보호자/ }));
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
}

function agreeToRequiredItems() {
  for (const checkbox of screen.getAllByRole('checkbox', { name: /필수/ })) {
    fireEvent.click(checkbox);
  }
}

it('필수 동의가 빠지면 제출할 수 없다', () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch');
  renderConsentPage();
  goToConsentStep();
  fireEvent.click(screen.getAllByRole('checkbox', { name: /필수/ })[0]);
  const submit = screen.getByRole('button', { name: '동의하고 시작하기' });
  expect(submit).toBeDisabled();
  fireEvent.click(submit);
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([false, true])('동의와 약관 버전을 전송하고 로그인으로 이동한다 (마케팅: %s)', async marketing => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ success: true, data: { consentTicket: 'test-consent-ticket' } })),
  );
  renderConsentPage();
  goToConsentStep();
  agreeToRequiredItems();
  if (marketing) fireEvent.click(screen.getByRole('checkbox', { name: /선택/ }));
  fireEvent.click(screen.getByRole('button', { name: '동의하고 시작하기' }));

  await screen.findByRole('heading', { name: '로그인 화면' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/auth/consent');
  expect(options?.method).toBe('POST');
  expect(JSON.parse(options?.body as string)).toEqual({
    basicInfo: true,
    sensitiveInfo: true,
    caregiverShare: true,
    marketing,
    termsVersion: '1.0',
  });
});

it('pendingGoogle이 있으면 동의 후 /google-register로 이동한다', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ success: true, data: { consentTicket: 'test-consent-ticket' } })),
  );
  renderConsentPage({
    pendingGoogle: { pendingToken: 'pending-token', email: 'test@gmail.com', name: '테스트' },
  });
  goToConsentStep();
  agreeToRequiredItems();
  fireEvent.click(screen.getByRole('button', { name: '동의하고 시작하기' }));

  await screen.findByRole('heading', { name: '구글 가입 화면' });
});

it('동의 API가 실패하면 티켓을 저장하거나 이동하지 않고 재시도를 허용한다', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '테스트 오류' },
  }), { status: 500 }));
  renderConsentPage();
  goToConsentStep();
  agreeToRequiredItems();
  fireEvent.click(screen.getByRole('button', { name: '동의하고 시작하기' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('동의 처리 중 오류가 발생했어요. 다시 시도해주세요.');
  expect(screen.queryByRole('heading', { name: '로그인 화면' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '동의하고 시작하기' })).toBeEnabled();
});

it('상세 보기 버튼을 누르면 수집 항목·이용 목적·보유 기간이 펼쳐진다', () => {
  renderConsentPage();
  goToConsentStep();

  // 상세 패널이 초기에는 없어야 함
  expect(screen.queryByText('수집 항목')).not.toBeInTheDocument();

  // 첫 번째 항목(기본 개인정보) 상세 보기 토글 클릭
  fireEvent.click(screen.getByRole('button', { name: /기본 개인정보.*상세 보기/ }));

  expect(screen.getByText('수집 항목')).toBeInTheDocument();
  expect(screen.getByText('이용 목적')).toBeInTheDocument();
  expect(screen.getByText('보유·이용 기간')).toBeInTheDocument();
  expect(screen.getByText('동의 거부 권리')).toBeInTheDocument();
  expect(screen.getByText('거부 시 불이익')).toBeInTheDocument();
});

it('같은 항목 상세 보기 버튼을 다시 누르면 접힌다', () => {
  renderConsentPage();
  goToConsentStep();

  const toggleBtn = screen.getByRole('button', { name: /기본 개인정보.*상세 보기/ });
  fireEvent.click(toggleBtn);
  expect(screen.getByText('수집 항목')).toBeInTheDocument();

  fireEvent.click(toggleBtn);
  expect(screen.queryByText('수집 항목')).not.toBeInTheDocument();
});

it('다른 항목 상세 보기를 열면 이전 항목은 닫힌다', () => {
  renderConsentPage();
  goToConsentStep();

  fireEvent.click(screen.getByRole('button', { name: /기본 개인정보.*상세 보기/ }));
  expect(screen.getByText('수집 항목')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /건강·복약.*상세 보기/ }));
  // 두 번째 항목 상세가 열리고, 첫 번째 항목 상세 중복 없이 하나만 존재
  expect(screen.getAllByText('수집 항목')).toHaveLength(1);
  expect(screen.getByText('제3자 제공')).toBeInTheDocument();
});
