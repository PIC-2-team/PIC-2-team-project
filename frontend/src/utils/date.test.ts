import { expect, it } from 'vitest';
import { toSeoulDateKey } from './date';

it('UTC 기록 시각을 한국 날짜로 바꿔 달력 날짜를 표시한다', () => {
  expect(toSeoulDateKey('2026-10-16T15:30:00Z')).toBe('2026-10-17');
});
