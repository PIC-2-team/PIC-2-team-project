import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CareInfoPage } from './CareInfoPage';
import * as recordsApi from '../api/records';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ selectedRecipientId: 42 }) }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

it('돌봄정보 카테고리 목록과 각 카테고리별 기록 개수를 표시한다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByCategory').mockImplementation(async (_recipientId, category) => {
    const count = category === 'COMMUNICATION' ? 3 : 1;
    return {
      items: [],
      pagination: { page: 1, pageSize: 1, totalItems: count, totalPages: 1 },
    } as any;
  });

  render(<MemoryRouter><CareInfoPage /></MemoryRouter>);

  expect(await screen.findByRole('heading', { name: '돌봄정보', level: 1 })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: '중요 생활기록' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /의사소통/ })).toBeInTheDocument();
  expect(screen.getByText('3개')).toBeInTheDocument();
});

it('조회에 실패한 카테고리를 기록 없음으로 표시하지 않는다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByCategory').mockImplementation(async (_id, category) => {
    if (category === 'LIFESTYLE') throw new Error('조회 실패');
    return { items: [], pagination: { page: 1, pageSize: 1, totalItems: 0, totalPages: 0 } };
  });
  render(<MemoryRouter><CareInfoPage /></MemoryRouter>);
  expect(await screen.findByRole('button', { name: /생활습관.*조회 실패/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /식사.*0개/ })).toBeInTheDocument();
});
