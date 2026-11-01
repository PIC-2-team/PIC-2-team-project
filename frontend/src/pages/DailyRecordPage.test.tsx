import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DailyRecordPage } from './DailyRecordPage';
import * as recordsApi from '../api/records';
import * as schedulesApi from '../api/schedules';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ selectedRecipientId: 42, user: { role: 'GUARDIAN' } }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockEmpty() {
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } });
  vi.spyOn(schedulesApi, 'getSchedulesByMonth').mockResolvedValue([]);
}

it('달력의 기록은 세 개씩 표시하고 펼치면 나머지 기록도 표시한다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({
    items: [1, 2, 3, 4].map(id => ({ id, content: `오늘 기록 ${id}`, category: 'MEAL' as const, recordedAt: new Date().toISOString() })),
    pagination: { page: 1, pageSize: 100, totalItems: 4, totalPages: 1 },
  });
  vi.spyOn(schedulesApi, 'getSchedulesByMonth').mockResolvedValue([]);
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  await screen.findByText('오늘 기록 1');
  expect(screen.queryByText('오늘 기록 4')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /기록 펼치기/ }));
  expect(screen.getByText('오늘 기록 4')).toBeInTheDocument();
});

it('월별 조회 중에는 스켈레톤을 표시한다', () => {
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockReturnValue(new Promise(() => {}));
  vi.spyOn(schedulesApi, 'getSchedulesByMonth').mockReturnValue(new Promise(() => {}));
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  expect(screen.getByRole('status')).toBeInTheDocument();
});

it('조회 실패 시 에러를 표시하고 빈 목록 문구를 표시하지 않는다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockRejectedValue(new Error('네트워크 오류'));
  vi.spyOn(schedulesApi, 'getSchedulesByMonth').mockResolvedValue([]);
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('네트워크 오류');
  expect(screen.queryByText('이 날의 기록이 없어요.')).not.toBeInTheDocument();
});

it('기록 카드에 시간이 표시된다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({
    items: [{ id: 1, content: '산책 기록', category: 'LIFESTYLE' as const, recordedAt: new Date().toISOString() }],
    pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
  });
  vi.spyOn(schedulesApi, 'getSchedulesByMonth').mockResolvedValue([]);
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  await screen.findByText('산책 기록');
  // 시간 레이블이 오전/오후 형식으로 존재하는지 확인
  const timeEls = document.querySelectorAll('[class*="recordTime"]');
  expect(timeEls.length).toBeGreaterThan(0);
});

it('"일정" 탭 전환 시 일정 목록을 표시한다', async () => {
  mockEmpty();
  vi.spyOn(schedulesApi, 'getSchedulesByMonth').mockResolvedValue([
    { id: 1, careRecipientId: 42, createdById: 1, title: '병원 예약', scheduledAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]);
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('tab', { name: '일정' }));
  expect(await screen.findByText('병원 예약')).toBeInTheDocument();
});

it('"돌봄 기록" 탭이 기본 선택된다', async () => {
  mockEmpty();
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  const tab = screen.getByRole('tab', { name: '돌봄 기록' });
  expect(tab).toHaveAttribute('aria-selected', 'true');
});

it('돌봄 기록과 일정 달력은 조회와 선택 날짜를 각각 유지한다', async () => {
  mockEmpty();
  const records = vi.mocked(recordsApi.getRecordsByMonth);
  const schedules = vi.mocked(schedulesApi.getSchedulesByMonth);
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  await screen.findByText('이 날의 기록이 없어요.');
  expect(schedules).not.toHaveBeenCalled();
  expect(screen.getByRole('region', { name: '돌봄 기록 달력' })).not.toHaveClass(/scheduleCalendar/);
  fireEvent.click(screen.getByRole('button', { name: '다음 달' }));
  fireEvent.click(screen.getByRole('button', { name: /월 5일/ }));
  const recordMonth = screen.getByRole('heading', { level: 2, name: /년.*월/ }).textContent;
  fireEvent.click(screen.getByRole('tab', { name: '일정' }));
  await screen.findByText('이 날의 일정이 없어요.');
  expect(schedules).toHaveBeenCalled();
  expect(screen.getByRole('region', { name: '일정 달력' })).toHaveClass(/scheduleCalendar/);
  expect(screen.getByRole('heading', { level: 2, name: /년.*월/ }).textContent).not.toBe(recordMonth);
  expect(screen.getByRole('button', { name: /월 5일/ })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('tab', { name: '돌봄 기록' }));
  await screen.findByText('이 날의 기록이 없어요.');
  expect(screen.getByRole('heading', { level: 2, name: /년.*월/ }).textContent).toBe(recordMonth);
  expect(screen.getByRole('button', { name: /월 5일/ })).toHaveAttribute('aria-pressed', 'true');
  expect(records).toHaveBeenCalled();
});
