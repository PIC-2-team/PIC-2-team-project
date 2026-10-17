import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CareInfoPage } from './CareInfoPage';
import { DailyRecordPage } from './DailyRecordPage';
import * as careApi from '../api/careInfo';
import * as recordsApi from '../api/records';
import type { DailyRecord } from '../types/record';
import type { PaginatedData } from '../types/common';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ selectedRecipientId: 42, user: { role: 'GUARDIAN' } }),
}));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 14, 12));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

it('카테고리 변경 시 불러온 개요에서 해당 정보를 표시한다', async () => {
  const overview = vi.spyOn(careApi, 'getCareInfoOverview').mockResolvedValue({
    categories: [
      { category: 'COMMUNICATION', content: '기존 의사소통정보', updatedAt: '2026-10-14' },
      { category: 'PREFERENCE', content: '최신 선호정보', updatedAt: '2026-10-14' },
    ],
    pinnedRecords: [],
  });
  render(<CareInfoPage />);
  await screen.findByText('기존 의사소통정보');
  fireEvent.click(screen.getByRole('button', { name: '선호·비선호' }));
  await screen.findByText('최신 선호정보');
  expect(overview).toHaveBeenCalledTimes(1);
});

it.each(['success', 'error'] as const)('월 변경 후 이전 요청의 %s를 무시한다', async result => {
  const old = deferred<PaginatedData<DailyRecord>>();
  const pagination = { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 };
  const today = new Date();
  const next = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const recordedAt = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}T12:00:00`;
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockReturnValueOnce(old.promise).mockResolvedValueOnce({
    items: [{ id: 7, category: 'OTHER', content: '최신 월 기록', recordedAt } as DailyRecord], pagination,
  });
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '다음 달' }));
  await screen.findByText('최신 월 기록');
  await act(async () => {
    if (result === 'success') old.resolve({ items: [], pagination });
    else old.reject(new Error('오래된 월 오류'));
  });
  expect(screen.getByText('최신 월 기록')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
