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

it('목록 조회 실패는 기록 없음으로 표시하지 않는다', async () => {
  vi.spyOn(recordsApi, 'getRecords').mockRejectedValue(new Error('네트워크 오류'));
  render(<MemoryRouter initialEntries={['/records?view=list']}><DailyRecordPage /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('네트워크 오류');
  expect(screen.queryByText('조회된 기록이 없어요.')).not.toBeInTheDocument();
});

it('필터 조회 실패 후 이전 필터의 페이지 탐색을 노출하지 않는다', async () => {
  vi.spyOn(recordsApi, 'getRecords')
    .mockResolvedValueOnce({ items: [], pagination: { page: 1, pageSize: 20, totalItems: 60, totalPages: 3 } })
    .mockRejectedValueOnce(new Error('조회 실패'));
  render(<MemoryRouter initialEntries={['/records?view=list']}><DailyRecordPage /></MemoryRouter>);
  await screen.findByRole('navigation', { name: '기록 페이지' });
  fireEvent.change(screen.getByRole('combobox', { name: '카테고리' }), { target: { value: 'HEALTH' } });
  await screen.findByRole('alert');
  expect(screen.queryByRole('navigation', { name: '기록 페이지' })).not.toBeInTheDocument();
});

it('조회 중에는 빈 목록 문구를 표시하지 않는다', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof recordsApi.getRecords>>) => void;
  vi.spyOn(recordsApi, 'getRecords').mockReturnValue(new Promise(result => { resolve = result; }));
  render(<MemoryRouter initialEntries={['/records?view=list']}><DailyRecordPage /></MemoryRouter>);
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.queryByText('조회된 기록이 없어요.')).not.toBeInTheDocument();
  resolve({ items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
  expect(await screen.findByText('조회된 기록이 없어요.')).toBeInTheDocument();
});

it('달력의 기록은 세 개씩 표시하고 펼치면 나머지 기록도 표시한다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({
    items: [1, 2, 3, 4].map(id => ({ id, content: `오늘 기록 ${id}`, category: 'MEAL' as const, recordedAt: new Date().toISOString() })),
    pagination: { page: 1, pageSize: 100, totalItems: 4, totalPages: 1 },
  });
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  await screen.findByText('오늘 기록 1');
  expect(screen.queryByText('오늘 기록 4')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /기록 펼치기/ }));
  expect(screen.getByText('오늘 기록 4')).toBeInTheDocument();
});

it('전체 목록의 서버 페이지 안에서는 기록을 세 개로 잘라 숨기지 않는다', async () => {
  vi.spyOn(recordsApi, 'getRecords').mockResolvedValue({
    items: [1, 2, 3, 4].map(id => ({ id, content: `목록 기록 ${id}`, category: 'MEAL' as const, recordedAt: '2026-10-23T00:00:00Z' })),
    pagination: { page: 1, pageSize: 20, totalItems: 4, totalPages: 1 },
  });
  render(<MemoryRouter initialEntries={['/records?view=list']}><DailyRecordPage /></MemoryRouter>);
  expect(await screen.findByText('목록 기록 4')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /기록 펼치기/ })).not.toBeInTheDocument();
});

it('월별 조회 중에는 스켈레톤을 표시한다', () => {
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockReturnValue(new Promise(() => {}));
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  expect(screen.getByRole('status')).toBeInTheDocument();
});
