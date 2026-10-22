import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setTokenProvider } from '../api/client';
import { RecordDetailPage } from './RecordDetailPage';

HTMLDialogElement.prototype.showModal = vi.fn(function(this: HTMLDialogElement) {
  this.open = true;
});
HTMLDialogElement.prototype.close = vi.fn(function(this: HTMLDialogElement) {
  this.open = false;
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: '홍길동', email: 'g@test.com', role: 'GUARDIAN' },
    selectedRecipientId: 1,
    logout: vi.fn(),
  }),
}));

beforeEach(() => {
  setTokenProvider(() => 'test-token');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage(id = '42') {
  render(
    <MemoryRouter initialEntries={[`/records/${id}`]}>
      <Routes>
        <Route path="/records/:id" element={<RecordDetailPage />} />
        <Route path="/records" element={<h1>목록</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

it('삭제 버튼 클릭 시 window.confirm 없이 인앱 확인 다이얼로그가 표시된다', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm');
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({
      success: true,
      data: { id: 42, recipientId: 1, content: '테스트', category: 'OTHER', recordedAt: '2026-10-22T10:00:00', isPinned: false },
    })),
  );
  renderPage();
  expect(await screen.findByText('테스트')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /삭제/ }));
  expect(confirmSpy).not.toHaveBeenCalled();
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
});
