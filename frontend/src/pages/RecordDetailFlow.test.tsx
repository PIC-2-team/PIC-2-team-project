import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { DailyRecordPage } from './DailyRecordPage';
import * as recordsApi from '../api/records';
import * as notificationsApi from '../api/notifications';
import type { DailyRecord } from '../types/record';

let mockRecipientId: number | null = 42;
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ selectedRecipientId: mockRecipientId, user: { id: 1, name: '보호자', role: 'GUARDIAN' } }),
}));

function LocationMarker() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}{location.search}</span>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mockRecipientId = 42;
});

it('직접 주소로 진입해도 당사자 선택 전에는 상세 모달을 열지 않는다', async () => {
  mockRecipientId = null;
  const getRecord = vi.spyOn(recordsApi, 'getRecord').mockResolvedValue({
    id: 101, author: { id: 1, name: '보호자', role: 'GUARDIAN' },
    content: '기록 내용', category: 'MEAL', recordedAt: '2026-10-22T12:00:00Z',
  });
  vi.spyOn(recordsApi, 'getRecordRevisions').mockResolvedValue({
    items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
  });
  vi.spyOn(notificationsApi, 'getUnreadNotificationCount').mockResolvedValue(0);
  const router = createMemoryRouter([{
    path: '/', element: <AppLayout />,
    children: [{ path: 'records', element: <p>당사자 선택 중</p> }],
  }], { initialEntries: ['/records?record=101'] });
  render(<RouterProvider router={router} />);

  expect(screen.queryByRole('dialog', { name: '기록 상세' })).not.toBeInTheDocument();
  expect(getRecord).not.toHaveBeenCalled();
  mockRecipientId = 42;
  await act(async () => {
    await router.navigate('/records?record=101', { replace: true, state: { recipientReady: true } });
  });
  expect(await screen.findByRole('dialog', { name: '기록 상세' })).toBeInTheDocument();
  expect(getRecord).toHaveBeenCalledWith(42, 101);
});

it.each(['닫기 버튼', '브라우저 뒤로가기'])('목록 위에서 상세 모달을 열고 수정 후 %s로 닫아도 목록이 갱신된다', async closeMethod => {
  let content = '원래 기록';
  const record = (): DailyRecord => ({
    id: 101, author: { id: 1, name: '보호자', role: 'GUARDIAN' },
    content, category: 'MEAL', recordedAt: '2026-10-22T12:00:00Z',
  });
  const list = vi.spyOn(recordsApi, 'getRecords').mockImplementation(async () => ({
    items: [record()], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  }));
  vi.spyOn(recordsApi, 'getRecord').mockImplementation(async () => record());
  vi.spyOn(recordsApi, 'getRecordRevisions').mockResolvedValue({
    items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
  });
  vi.spyOn(recordsApi, 'updateRecord').mockImplementation(async (_recipientId, _recordId, request) => {
    content = request.content ?? content;
    return record();
  });
  vi.spyOn(notificationsApi, 'getUnreadNotificationCount').mockResolvedValue(0);

  const router = createMemoryRouter([{
    path: '/', element: <AppLayout />,
    children: [{ path: 'records', element: <><DailyRecordPage /><LocationMarker /></> }],
  }], { initialEntries: ['/records?view=list'] });
  render(<RouterProvider router={router} />);

  fireEvent.click(await screen.findByRole('link', { name: '원래 기록' }));
  expect(await screen.findByRole('dialog', { name: '기록 상세' })).toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: '기록 상세' }).closest('.app-shell')).not.toBeNull();
  expect(screen.getByTestId('location')).toHaveTextContent('/records?view=list&record=101');
  expect(screen.getByRole('link', { name: '원래 기록' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '수정' }));
  fireEvent.change(screen.getByRole('textbox', { name: '기록 내용 수정' }), { target: { value: '수정된 기록' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByText('수정된 기록');
  await waitFor(() => expect(list.mock.calls.length).toBeGreaterThanOrEqual(2));
  if (closeMethod === '브라우저 뒤로가기') {
    await act(async () => { await router.navigate(-1); });
  } else {
    fireEvent.click(screen.getByRole('button', { name: '기록 상세 닫기' }));
  }

  expect(await screen.findByRole('link', { name: '수정된 기록' })).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('/records?view=list');
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '기록 상세' })).not.toBeInTheDocument());
});
