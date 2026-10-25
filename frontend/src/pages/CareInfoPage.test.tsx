import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CareInfoPage } from './CareInfoPage';
import * as careInfoApi from '../api/careInfo';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ selectedRecipientId: 42 }) }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

it('카테고리 카드 8개를 그리드로 표시한다', async () => {
  vi.spyOn(careInfoApi, 'getCareInfoOverview').mockResolvedValue({
    categories: [],
    pinnedRecords: [
      { id: 1, content: '말로 표현하기 어려워해요', category: 'COMMUNICATION', recordedAt: '2026-10-01T00:00:00Z', pinned: true },
      { id: 2, content: '밥은 잘게 잘라줘야 해요', category: 'MEAL', recordedAt: '2026-10-02T00:00:00Z', pinned: true },
    ],
  });

  render(<MemoryRouter><CareInfoPage /></MemoryRouter>);

  expect(await screen.findByRole('heading', { name: '돌봄정보', level: 1 })).toBeInTheDocument();

  // 8개 카테고리 카드 버튼
  expect(screen.getByRole('button', { name: /의사소통 상세 보기/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /식사 상세 보기/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /생활습관 상세 보기/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /기타 상세 보기/ })).toBeInTheDocument();

  // pinned 배지 (COMMUNICATION, MEAL 각 1개)
  expect(screen.getAllByLabelText('중요 정보 1개')).toHaveLength(2);
});

it('pinned 기록이 없으면 배지를 표시하지 않는다', async () => {
  vi.spyOn(careInfoApi, 'getCareInfoOverview').mockResolvedValue({
    categories: [],
    pinnedRecords: [],
  });

  render(<MemoryRouter><CareInfoPage /></MemoryRouter>);

  await screen.findByRole('heading', { name: '돌봄정보', level: 1 });
  expect(screen.queryByLabelText(/중요 정보/)).not.toBeInTheDocument();
});

it('조회 실패 시 에러 메시지를 표시한다', async () => {
  vi.spyOn(careInfoApi, 'getCareInfoOverview').mockRejectedValue(new Error('서버 오류'));

  render(<MemoryRouter><CareInfoPage /></MemoryRouter>);

  expect(await screen.findByRole('alert')).toHaveTextContent('서버 오류');
});
