import { afterEach, expect, it, vi } from 'vitest';
import { getRecords, getRecordsByMonth } from './records';
import { setTokenProvider } from './client';

afterEach(() => { vi.restoreAllMocks(); setTokenProvider(() => null); });

it('전체 기록 조회는 날짜 제한 없이 카테고리와 페이지를 전달한다', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true, data: { items: [] } })));
  await getRecords(42, 'MEAL', 2);
  expect(fetch).toHaveBeenCalledWith('/api/care-recipients/42/records?page=2&pageSize=20&category=MEAL', expect.any(Object));
});

it('월별 조회에 선택한 카테고리를 전달한다', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true, data: { items: [] } })));
  await getRecordsByMonth(42, 2026, 10, 'HEALTH');
  expect(fetch).toHaveBeenCalledWith('/api/care-recipients/42/records?year=2026&month=10&pageSize=100&category=HEALTH', expect.any(Object));
});
