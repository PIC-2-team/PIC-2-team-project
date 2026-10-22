import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DailyRecordPage } from './DailyRecordPage';
import * as recordsApi from '../api/records';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ selectedRecipientId: 1, user: { role: 'GUARDIAN' } }),
}));

const TODAY_KEY = (() => {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
})();

const makeRecord = (id: number, category: string, content: string) => ({
  id,
  careRecipientId: 1,
  authorId: 1,
  authorName: '보호자',
  category,
  content,
  recordedAt: `${TODAY_KEY}T10:00:00`,
  isPinned: false,
  mediaFiles: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({
    items: [
      makeRecord(1, 'MEAL', '점심 식사'),
      makeRecord(2, 'MEAL', '저녁 식사'),
      makeRecord(3, 'HEALTH', '투약 완료'),
      makeRecord(4, 'LIFESTYLE', '산책 30분'),
    ],
  } as any);
});

afterEach(() => {
  cleanup();
});

it('필터 버튼 클릭 시 카테고리 필터 시트가 표시된다', async () => {
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);

  await screen.findByText('점심 식사');

  fireEvent.click(screen.getByRole('button', { name: /필터/ }));

  expect(screen.getByRole('listbox', { name: '카테고리 필터' })).toBeInTheDocument();
});

it('카테고리 필터 선택 시 해당 카테고리 기록만 표시된다', async () => {
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);

  await screen.findByText('점심 식사');

  fireEvent.click(screen.getByRole('button', { name: /필터/ }));
  fireEvent.click(screen.getByRole('option', { name: '식사' }));

  expect(screen.getByText('점심 식사')).toBeInTheDocument();
  expect(screen.getByText('저녁 식사')).toBeInTheDocument();
  expect(screen.queryByText('투약 완료')).not.toBeInTheDocument();
  expect(screen.queryByText('산책 30분')).not.toBeInTheDocument();
});

it('기록이 3개를 초과하면 처음 3개만 표시하고 더보기 버튼이 나타난다', async () => {
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);

  await screen.findByText('점심 식사');

  expect(screen.getByText('점심 식사')).toBeInTheDocument();
  expect(screen.getByText('저녁 식사')).toBeInTheDocument();
  expect(screen.getByText('투약 완료')).toBeInTheDocument();
  expect(screen.queryByText('산책 30분')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /더보기/ })).toBeInTheDocument();
});

it('더보기 클릭 시 모든 기록이 펼쳐진다', async () => {
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);

  await screen.findByText('점심 식사');

  fireEvent.click(screen.getByRole('button', { name: /더보기/ }));

  expect(screen.getByText('산책 30분')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /더보기/ })).not.toBeInTheDocument();
});
