import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DailyRecordPage } from './DailyRecordPage';
import * as recordsApi from '../api/records';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ selectedRecipientId: 42, user: { role: 'GUARDIAN' } }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('더보기를 누르면 달력 없이 전체 기록을 조회하고 카테고리로 필터링한다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } });
  const list = vi.spyOn(recordsApi, 'getRecords').mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /더보기/ }));
  await waitFor(() => expect(list).toHaveBeenCalledWith(42, undefined, 1));
  expect(screen.getByRole('heading', { name: '돌봄 기록 목록', level: 1 })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: '월별 캘린더' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: '카테고리' }), { target: { value: 'MEAL' } });
  await waitFor(() => expect(list).toHaveBeenCalledWith(42, 'MEAL', 1));
});

it('달력에서도 선택한 카테고리로 조회한다', async () => {
  const monthly = vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } });
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  fireEvent.change(screen.getByRole('combobox', { name: '카테고리' }), { target: { value: 'HEALTH' } });
  await waitFor(() => expect(monthly).toHaveBeenLastCalledWith(42, expect.any(Number), expect.any(Number), 'HEALTH'));
});

it('전체 기록의 다음 페이지를 조회하고 필터 변경 시 첫 페이지로 돌아간다', async () => {
  const list = vi.spyOn(recordsApi, 'getRecords').mockResolvedValue({
    items: [{ id: 1, content: '산책 기록', category: 'LIFESTYLE', recordedAt: '2026-10-22T01:00:00Z' }],
    pagination: { page: 1, pageSize: 20, totalItems: 21, totalPages: 2 },
  });
  render(<MemoryRouter initialEntries={['/records?view=list']}><DailyRecordPage /></MemoryRouter>);
  expect(await screen.findByRole('link', { name: '산책 기록' })).toHaveAttribute('href', '/records/1');
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(42, undefined, 2));
  fireEvent.change(screen.getByRole('combobox', { name: '카테고리' }), { target: { value: 'MEAL' } });
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(42, 'MEAL', 1));
});
