import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { RecordDetailModal } from './RecordDetailModal';
import { AppLayout } from '../layouts/AppLayout';
import { DailyRecordPage } from '../pages/DailyRecordPage';
import * as recordsApi from '../api/records';
import * as notificationsApi from '../api/notifications';
import type { DailyRecord } from '../types/record';

let mockRecipientId = 1;
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ selectedRecipientId: mockRecipientId, user: { id: 7, role: 'GUARDIAN' } }),
}));

const record = (content: string): DailyRecord => ({
  id: 101, author: { id: 7, name: '보호자', role: 'GUARDIAN' },
  content, category: 'MEAL', recordedAt: '2026-10-22T12:00:00Z',
});

beforeEach(() => {
  mockRecipientId = 1;
  vi.spyOn(recordsApi, 'getRecordRevisions').mockResolvedValue({
    items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('당사자 전환 후 성공한 기록은 이전 조회 오류를 덮어쓴다', async () => {
  const getRecord = vi.spyOn(recordsApi, 'getRecord').mockImplementation(async recipientId => {
    if (recipientId === 1) throw new Error('이전 당사자 접근 오류');
    return record('새 당사자의 기록');
  });
  const view = render(<RecordDetailModal key={mockRecipientId} recordId={101} onClose={vi.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('이전 당사자 접근 오류');

  mockRecipientId = 2;
  view.rerender(<RecordDetailModal key={mockRecipientId} recordId={101} onClose={vi.fn()} />);
  await waitFor(() => expect(getRecord).toHaveBeenCalledWith(2, 101));
  expect(await screen.findByText('새 당사자의 기록')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('당사자 전환 중 이전 당사자의 기록은 숨긴다', async () => {
  let finishNewRequest!: (value: DailyRecord) => void;
  const pending = new Promise<DailyRecord>(resolve => { finishNewRequest = resolve; });
  vi.spyOn(recordsApi, 'getRecord').mockImplementation(recipientId =>
    recipientId === 1 ? Promise.resolve(record('이전 당사자의 기록')) : pending
  );
  const view = render(<RecordDetailModal key={mockRecipientId} recordId={101} onClose={vi.fn()} />);
  expect(await screen.findByText('이전 당사자의 기록')).toBeInTheDocument();

  mockRecipientId = 2;
  await act(async () => { view.rerender(<RecordDetailModal key={mockRecipientId} recordId={101} onClose={vi.fn()} />); });
  const oldRecordVisible = screen.queryByText('이전 당사자의 기록') !== null;
  const loadingVisible = screen.queryByRole('status') !== null;
  await act(async () => { finishNewRequest(record('새 당사자의 기록')); });
  expect(oldRecordVisible).toBe(false);
  expect(loadingVisible).toBe(true);
});

it('저장 중 닫은 뒤 요청 실패가 발생하면 사용자에게 알린다', async () => {
  let failRequest!: (reason: Error) => void;
  const pending = new Promise<DailyRecord>((_, reject) => { failRequest = reject; });
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(record('원래 기록'));
  vi.spyOn(recordsApi, 'updateRecord').mockImplementation(() => pending);

  function Harness() {
    const [open, setOpen] = useState(true);
    const [error, setError] = useState<string | null>(null);
    return <>
      {open && <RecordDetailModal recordId={101} onClose={() => setOpen(false)} onError={setError} />}
      {error && <p role="alert">{error}</p>}
    </>;
  }
  render(<Harness />);
  fireEvent.click(await screen.findByRole('button', { name: '수정' }));
  fireEvent.change(screen.getByRole('textbox', { name: '기록 내용 수정' }), { target: { value: '수정 시도' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  fireEvent.click(screen.getByRole('button', { name: '기록 상세 닫기' }));
  await act(async () => { failRequest(new Error('저장 실패')); try { await pending; } catch { /* expected */ } });
  expect(screen.getByRole('alert')).toHaveTextContent('저장 실패');
});

it('삭제 중 닫은 뒤 요청 실패가 발생하면 사용자에게 알린다', async () => {
  let failRequest!: (reason: Error) => void;
  const pending = new Promise<Awaited<ReturnType<typeof recordsApi.deleteRecord>>>((_, reject) => { failRequest = reject; });
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(record('원래 기록'));
  vi.spyOn(recordsApi, 'deleteRecord').mockImplementation(() => pending);

  function Harness() {
    const [open, setOpen] = useState(true);
    const [error, setError] = useState<string | null>(null);
    return <>
      {open && <RecordDetailModal recordId={101} onClose={() => setOpen(false)} onError={setError} />}
      {error && <p role="alert">{error}</p>}
    </>;
  }
  render(<Harness />);
  fireEvent.click(await screen.findByRole('button', { name: '삭제' }));
  fireEvent.click(screen.getByRole('alertdialog').querySelectorAll('button')[1]);
  fireEvent.click(screen.getByRole('button', { name: '기록 상세 닫기' }));
  await act(async () => { failRequest(new Error('삭제 실패')); try { await pending; } catch { /* expected */ } });
  expect(screen.getByRole('alert')).toHaveTextContent('삭제 실패');
});

it('목록에서 모달을 열고 닫은 뒤 뒤로가면 이전 페이지로 간다', async () => {
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(record('원래 기록'));
  vi.spyOn(recordsApi, 'getRecords').mockResolvedValue({
    items: [record('원래 기록')], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });
  vi.spyOn(notificationsApi, 'getUnreadNotificationCount').mockResolvedValue(0);
  function LocationMarker() {
    const location = useLocation();
    return <span data-testid="location">{location.pathname}{location.search}</span>;
  }
  const router = createMemoryRouter([{
    path: '/', element: <AppLayout />,
    children: [
      { path: 'records', element: <><DailyRecordPage /><LocationMarker /></> },
      { path: 'more', element: <p>이전 페이지</p> },
    ],
  }], { initialEntries: ['/more', '/records?view=list'], initialIndex: 1 });
  render(<RouterProvider router={router} />);
  fireEvent.click(await screen.findByRole('link', { name: '원래 기록' }));
  await screen.findByRole('dialog', { name: '기록 상세' });
  fireEvent.click(screen.getByRole('button', { name: '기록 상세 닫기' }));
  expect(screen.getByTestId('location')).toHaveTextContent('/records?view=list');
  await act(async () => { await router.navigate(-1); });
  expect(router.state.location.pathname).toBe('/more');
});

it('한 번 수정한 기록을 닫을 때 목록을 중복 조회하지 않는다', async () => {
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(record('원래 기록'));
  const list = vi.spyOn(recordsApi, 'getRecords').mockResolvedValue({
    items: [record('원래 기록')], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });
  vi.spyOn(recordsApi, 'updateRecord').mockResolvedValue(record('수정된 기록'));
  vi.spyOn(notificationsApi, 'getUnreadNotificationCount').mockResolvedValue(0);
  const router = createMemoryRouter([{
    path: '/', element: <AppLayout />,
    children: [{ path: 'records', element: <DailyRecordPage /> }],
  }], { initialEntries: ['/records?view=list'] });
  render(<RouterProvider router={router} />);
  fireEvent.click(await screen.findByRole('link', { name: '원래 기록' }));
  await screen.findByRole('dialog', { name: '기록 상세' });
  fireEvent.click(screen.getByRole('button', { name: '수정' }));
  fireEvent.change(screen.getByRole('textbox', { name: '기록 내용 수정' }), { target: { value: '수정된 기록' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('button', { name: '기록 상세 닫기' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '기록 상세' })).not.toBeInTheDocument());
  await act(async () => { await Promise.resolve(); });
  expect(list).toHaveBeenCalledTimes(2);
});
