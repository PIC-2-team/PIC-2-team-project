import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DailyRecordPage } from './DailyRecordPage';
import * as recordsApi from '../api/records';
import * as schedulesApi from '../api/schedules';

let mockRole = 'GUARDIAN';
let mockUserId = 1;
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ selectedRecipientId: 42, user: { id: mockUserId, role: mockRole } }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); mockRole = 'GUARDIAN'; mockUserId = 1; });

it('활동지원사에게 기록 작성 버튼이 표시된다', async () => {
  mockRole = 'SUPPORT_WORKER';
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({
    items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
  });
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  expect(screen.getByRole('button', { name: '기록하기' })).toBeInTheDocument();
});

it('전체 목록에서도 활동지원사에게 기록 작성 버튼이 표시된다', () => {
  mockRole = 'SUPPORT_WORKER';
  vi.spyOn(recordsApi, 'getRecords').mockResolvedValue({
    items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
  });
  render(<MemoryRouter initialEntries={['/records?view=list']}><DailyRecordPage /></MemoryRouter>);
  expect(screen.getByRole('button', { name: '기록하기' })).toBeInTheDocument();
});

function mockEmpty() {
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } });
  vi.spyOn(schedulesApi, 'getSchedulesByMonth').mockResolvedValue([]);
}

it('일정 탭 쿼리로 진입하면 일정 탭을 선택한다', async () => {
  mockEmpty();
  render(<MemoryRouter initialEntries={['/records?tab=schedules']}><DailyRecordPage /></MemoryRouter>);

  expect(screen.getByRole('tab', { name: '일정' })).toHaveAttribute('aria-selected', 'true');
  await waitFor(() => expect(schedulesApi.getSchedulesByMonth).toHaveBeenCalled());
});

it('더보기를 누르면 달력 없이 전체 기록을 조회하고 카테고리로 필터링한다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } });
  const list = vi.spyOn(recordsApi, 'getRecords').mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /더보기/ }));
  await waitFor(() => expect(list).toHaveBeenCalledWith(42, undefined, 1));
  expect(screen.getByRole('heading', { name: '돌봄 기록 목록', level: 1 })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: '돌봄 기록 달력' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: '카테고리' }), { target: { value: 'MEAL' } });
  await waitFor(() => expect(list).toHaveBeenCalledWith(42, 'MEAL', 1));
});

it('달력에는 카테고리 필터를 표시하지 않는다', async () => {
  const monthly = vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } });
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  await waitFor(() => expect(monthly).toHaveBeenCalled());
  expect(screen.queryByRole('combobox', { name: '카테고리' })).not.toBeInTheDocument();
});

it('전체 기록의 다음 페이지를 조회하고 필터 변경 시 첫 페이지로 돌아간다', async () => {
  const list = vi.spyOn(recordsApi, 'getRecords').mockResolvedValue({
    items: [{ id: 1, content: '산책 기록', category: 'LIFESTYLE', recordedAt: '2026-10-22T01:00:00Z' }],
    pagination: { page: 1, pageSize: 20, totalItems: 21, totalPages: 2 },
  });
  render(<MemoryRouter initialEntries={['/records?view=list']}><DailyRecordPage /></MemoryRouter>);
  expect(await screen.findByRole('link', { name: '산책 기록' })).toHaveAttribute('href', '/records?view=list&record=1');
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
  vi.spyOn(schedulesApi, 'getSchedulesByMonth').mockResolvedValue([]);
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

it('활동지원사 일정 탭에 일정 추가와 삭제 기능을 표시한다', async () => {
  mockRole = 'SUPPORT_WORKER';
  mockUserId = 2;
  mockEmpty();
  vi.spyOn(schedulesApi, 'getSchedulesByMonth').mockResolvedValue([
    { id: 1, careRecipientId: 42, createdById: 2, title: '병원 예약', scheduledAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]);
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('tab', { name: '일정' }));
  await screen.findByText('병원 예약');

  expect(screen.getByRole('button', { name: '+ 일정 추가' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '병원 예약 삭제' })).toBeInTheDocument();
});

it('"돌봄 기록" 탭이 기본 선택된다', async () => {
  mockEmpty();
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  const tab = screen.getByRole('tab', { name: '돌봄 기록' });
  expect(tab).toHaveAttribute('aria-selected', 'true');
});

it('기록과 일정 달력은 각각 월과 선택 날짜를 기억한다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } });
  const schedules = vi.spyOn(schedulesApi, 'getSchedulesByMonth').mockResolvedValue([]);
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  await screen.findByText('이 날의 기록이 없어요.');
  expect(schedules).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '다음 달' }));
  fireEvent.click(screen.getByRole('button', { name: /월 5일/ }));
  const recordMonth = screen.getByRole('heading', { level: 2, name: /년.*월/ }).textContent;
  fireEvent.click(screen.getByRole('tab', { name: '일정' }));
  await screen.findByText('이 날의 일정이 없어요.');
  expect(schedules).toHaveBeenCalled();
  expect(screen.getByRole('region', { name: '일정 달력' })).toHaveClass(/scheduleCalendar/);
  expect(screen.getByRole('heading', { level: 2, name: /년.*월/ }).textContent).not.toBe(recordMonth);
  fireEvent.click(screen.getByRole('tab', { name: '돌봄 기록' }));
  expect(screen.getByRole('heading', { level: 2, name: /년.*월/ }).textContent).toBe(recordMonth);
  expect(screen.getByRole('button', { name: /월 5일/ })).toHaveAttribute('aria-pressed', 'true');
});

it('기록과 일정 탭을 전환하고 월을 바꿔도 달력은 6주 높이를 유지한다', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-02-15T03:00:00Z'));
  mockEmpty();
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  vi.useRealTimers();

  await screen.findByText('이 날의 기록이 없어요.');
  const calendarGrid = () => screen.getByRole('region', { name: /달력/ }).querySelector('.calendar-grid')!;
  const cellCount = () => calendarGrid().children.length;

  expect(cellCount()).toBe(49);
  fireEvent.click(screen.getByRole('button', { name: '다음 달' }));
  expect(cellCount()).toBe(49);
  fireEvent.click(screen.getByRole('tab', { name: '일정' }));
  await screen.findByText('이 날의 일정이 없어요.');
  expect(cellCount()).toBe(49);
  fireEvent.click(screen.getByRole('tab', { name: '돌봄 기록' }));
  expect(cellCount()).toBe(49);
});

it('일정 입력의 오전 9시는 서울 시간 기준으로 저장한다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } });
  vi.spyOn(schedulesApi, 'getSchedulesByMonth').mockResolvedValue([]);
  const create = vi.spyOn(schedulesApi, 'createSchedule').mockImplementation(async (_, payload) => ({
    id: 1, careRecipientId: 42, createdById: 1, title: payload.title,
    scheduledAt: payload.scheduledAt, createdAt: payload.scheduledAt, updatedAt: payload.scheduledAt,
  }));
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('tab', { name: '일정' }));
  await screen.findByText('이 날의 일정이 없어요.');
  fireEvent.click(screen.getByRole('button', { name: '+ 일정 추가' }));
  fireEvent.change(screen.getByRole('textbox', { name: '일정 제목' }), { target: { value: '병원 방문' } });
  fireEvent.click(screen.getByRole('button', { name: /^추가$/ }));
  await waitFor(() => expect(create).toHaveBeenCalledWith(42, expect.objectContaining({
    title: '병원 방문', scheduledAt: expect.stringMatching(/T00:00:00\.000Z$/),
  })));
});

it.each(['GUARDIAN', 'SUPPORT_WORKER'])('%s는 일정 추가 UI를 사용할 수 있다', async role => {
  mockRole = role;
  mockEmpty();
  const create = vi.spyOn(schedulesApi, 'createSchedule').mockResolvedValue({
    id: 1, careRecipientId: 42, createdById: 2, title: '병원 방문',
    scheduledAt: '2026-11-01T00:00:00.000Z', createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z',
  });
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('tab', { name: '일정' }));
  await screen.findByText('이 날의 일정이 없어요.');
  expect(screen.getByRole('button', { name: '+ 일정 추가' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '+ 일정 추가' }));
  expect(screen.queryByText('이 날의 일정이 없어요.')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: '일정 제목' }), { target: { value: '병원 방문' } });
  fireEvent.click(screen.getByRole('button', { name: /^추가$/ }));
  await waitFor(() => expect(create).toHaveBeenCalledWith(42, expect.objectContaining({ title: '병원 방문' })));
});

it('일정 삭제 버튼은 작성자 본인의 일정에만 표시한다', async () => {
  mockUserId = 1;
  vi.spyOn(recordsApi, 'getRecordsByMonth').mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } });
  const now = new Date().toISOString();
  vi.spyOn(schedulesApi, 'getSchedulesByMonth').mockResolvedValue([
    { id: 1, careRecipientId: 42, createdById: 1, title: '내 일정', scheduledAt: now, createdAt: now, updatedAt: now },
    { id: 2, careRecipientId: 42, createdById: 2, title: '다른 보호자 일정', scheduledAt: now, createdAt: now, updatedAt: now },
  ]);
  render(<MemoryRouter><DailyRecordPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('tab', { name: '일정' }));
  await screen.findByText('다른 보호자 일정');
  expect(screen.getByRole('button', { name: '내 일정 삭제' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '다른 보호자 일정 삭제' })).not.toBeInTheDocument();
});
