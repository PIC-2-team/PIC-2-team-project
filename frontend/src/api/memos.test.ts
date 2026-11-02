import { afterEach, expect, it, vi } from 'vitest';
import * as client from './client';
import { getMemosByMonth } from './memos';

afterEach(() => vi.restoreAllMocks());

it('연월별 메모 목록 API를 호출한다', async () => {
  const request = vi.spyOn(client, 'apiRequest').mockResolvedValue([]);

  await expect(getMemosByMonth(42, 2026, 11)).resolves.toEqual([]);
  expect(request).toHaveBeenCalledWith('/api/care-recipients/42/memos/month?year=2026&month=11');
});
