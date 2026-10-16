import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CareInfoPage } from './CareInfoPage';
import * as careInfoApi from '../api/careInfo';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ selectedRecipientId: 42 }) }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

it('돌봄정보 개요의 고정 생활기록을 카테고리 정보와 별도로 표시한다', async () => {
  vi.spyOn(careInfoApi, 'getCareInfoOverview').mockResolvedValue({
    categories: [{ category: 'COMMUNICATION', content: '천천히 말해주세요.', updatedAt: '2026-10-16T00:00:00Z' }],
    pinnedRecords: [{
      id: 8, content: '오후에 산책을 했습니다.', category: 'LIFESTYLE', recordedAt: '2026-10-16T01:00:00Z',
    }],
  });

  render(<MemoryRouter><CareInfoPage /></MemoryRouter>);

  expect(await screen.findByRole('heading', { name: '중요 생활기록' })).toBeInTheDocument();
  expect(screen.getByText('오후에 산책을 했습니다.')).toBeInTheDocument();
  expect(screen.getByText('천천히 말해주세요.')).toBeInTheDocument();
});
