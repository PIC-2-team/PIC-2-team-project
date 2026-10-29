import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RecordDetailPage } from './RecordDetailPage';
import * as recordsApi from '../api/records';
import type { DailyRecord } from '../types/record';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockRole = 'GUARDIAN';
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ selectedRecipientId: 42, user: { id: mockRole === 'SUPPORT_WORKER' ? 2 : 1, role: mockRole } }),
}));

const sampleRecord: DailyRecord = {
  id: 101,
  author: { id: 1, name: '보호자', role: 'GUARDIAN' },
  content: '오늘 점심에 밥을 맛있게 먹었어요.',
  category: 'MEAL',
  recordedAt: '2026-10-22T12:00:00Z',
};

beforeEach(() => {
  mockRole = 'GUARDIAN';
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

it('기록 상세 정보를 정상적으로 렌더링한다', async () => {
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(sampleRecord);

  render(
    <MemoryRouter initialEntries={['/records/101']}>
      <Routes>
        <Route path="/records/:id" element={<RecordDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByRole('heading', { name: '기록 상세', level: 1 })).toBeInTheDocument();
  expect(screen.getByText('오늘 점심에 밥을 맛있게 먹었어요.')).toBeInTheDocument();
  expect(screen.getByText('식사')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument();
});

it('보호자가 수정 버튼을 누르면 수정 모드로 전환되고 저장 시 updateRecord가 호출된다', async () => {
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(sampleRecord);
  const updateSpy = vi.spyOn(recordsApi, 'updateRecord').mockResolvedValue({
    ...sampleRecord,
    content: '수정된 기록 내용입니다.',
    category: 'LIFESTYLE',
  });

  render(
    <MemoryRouter initialEntries={['/records/101']}>
      <Routes>
        <Route path="/records/:id" element={<RecordDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  const editBtn = await screen.findByRole('button', { name: '수정' });
  fireEvent.click(editBtn);

  // 수정 모드 진입 확인
  expect(screen.getByRole('heading', { name: '기록 수정', level: 1 })).toBeInTheDocument();
  const textarea = screen.getByRole('textbox', { name: '기록 내용 수정' });
  expect(textarea).toHaveValue('오늘 점심에 밥을 맛있게 먹었어요.');

  // 카테고리 변경 (생활습관)
  const lifestyleChip = screen.getByRole('button', { name: '생활습관' });
  fireEvent.click(lifestyleChip);
  expect(lifestyleChip).toHaveAttribute('aria-pressed', 'true');

  // 내용 수정
  fireEvent.change(textarea, { target: { value: '수정된 기록 내용입니다.' } });

  // 저장 클릭
  const saveBtn = screen.getByRole('button', { name: '저장' });
  fireEvent.click(saveBtn);

  await waitFor(() => {
    expect(updateSpy).toHaveBeenCalledWith(42, 101, {
      content: '수정된 기록 내용입니다.',
      category: 'LIFESTYLE',
    });
  });

  // 수정 완료 후 상세 뷰로 복귀 및 갱신 확인
  expect(await screen.findByRole('heading', { name: '기록 상세', level: 1 })).toBeInTheDocument();
  expect(screen.getByText('기록이 수정되었어요.')).toBeInTheDocument();
  expect(screen.getByText('수정된 기록 내용입니다.')).toBeInTheDocument();
  expect(screen.getByText('생활습관')).toBeInTheDocument();
});

it('수정 모드에서 취소 버튼 클릭 시 수정이 취소되고 원래 내용이 유지된다', async () => {
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(sampleRecord);

  render(
    <MemoryRouter initialEntries={['/records/101']}>
      <Routes>
        <Route path="/records/:id" element={<RecordDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  const editBtn = await screen.findByRole('button', { name: '수정' });
  fireEvent.click(editBtn);

  const textarea = screen.getByRole('textbox', { name: '기록 내용 수정' });
  fireEvent.change(textarea, { target: { value: '취소할 내용' } });

  const cancelBtn = screen.getByRole('button', { name: '취소' });
  fireEvent.click(cancelBtn);

  expect(screen.getByRole('heading', { name: '기록 상세', level: 1 })).toBeInTheDocument();
  expect(screen.getByText('오늘 점심에 밥을 맛있게 먹었어요.')).toBeInTheDocument();
  expect(screen.queryByText('취소할 내용')).not.toBeInTheDocument();
});

it('활동지원사는 본인 기록만 수정·삭제할 수 있다', async () => {
  mockRole = 'SUPPORT_WORKER';
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue({
    ...sampleRecord, author: { id: 2, name: '활동지원사', role: 'SUPPORT_WORKER' },
  });
  render(<MemoryRouter initialEntries={['/records/101']}><Routes>
    <Route path="/records/:id" element={<RecordDetailPage />} />
  </Routes></MemoryRouter>);
  expect(await screen.findByRole('button', { name: '수정' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '수정 제안' })).not.toBeInTheDocument();
});

it.each(['GUARDIAN', 'SUPPORT_WORKER'])('%s는 다른 작성자의 기록을 수정·삭제할 수 없다', async role => {
  mockRole = role;
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue({
    ...sampleRecord,
    author: role === 'GUARDIAN'
      ? { id: 2, name: '활동지원사', role: 'SUPPORT_WORKER' }
      : sampleRecord.author,
  });
  render(<MemoryRouter initialEntries={['/records/101']}><Routes>
    <Route path="/records/:id" element={<RecordDetailPage />} />
  </Routes></MemoryRouter>);
  expect(await screen.findByText(sampleRecord.content)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
});
it('보호자가 삭제 버튼을 누르고 확인하면 deleteRecord 호출 후 목록으로 이동한다', async () => {
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(sampleRecord);
  const deleteSpy = vi.spyOn(recordsApi, 'deleteRecord').mockResolvedValue({
    deletedAt: '2026-10-22T12:30:00Z',
    restoreUntil: '2026-11-21T12:30:00Z',
  });
  HTMLDialogElement.prototype.showModal = vi.fn(function(this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function(this: HTMLDialogElement) { this.open = false; });

  render(
    <MemoryRouter initialEntries={['/records/101']}>
      <Routes>
        <Route path="/records/:id" element={<RecordDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  const deleteBtn = await screen.findByRole('button', { name: '삭제' });
  fireEvent.click(deleteBtn);
  fireEvent.click(screen.getByRole('alertdialog').querySelectorAll('button')[1]);

  await waitFor(() => {
    expect(deleteSpy).toHaveBeenCalledWith(42, 101);
    expect(mockNavigate).toHaveBeenCalledWith('/records', { replace: true });
  });
});

it('보호자가 기록 수정을 저장하면 수정 이력을 즉시 재조회한다', async () => {
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(sampleRecord);
  vi.spyOn(recordsApi, 'updateRecord').mockResolvedValue({
    ...sampleRecord,
    content: '수정된 기록 내용입니다.',
  });
  const revisionsSpy = vi.spyOn(recordsApi, 'getRecordRevisions').mockResolvedValue({
    items: [],
    pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
  });

  render(
    <MemoryRouter initialEntries={['/records/101']}>
      <Routes>
        <Route path="/records/:id" element={<RecordDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  const editBtn = await screen.findByRole('button', { name: '수정' });
  fireEvent.click(editBtn);

  const saveBtn = screen.getByRole('button', { name: '저장' });
  fireEvent.click(saveBtn);

  // 마운트 시 1회 + submitEdit 성공 후 1회 = 총 2회
  await waitFor(() => {
    expect(revisionsSpy).toHaveBeenCalledTimes(2);
  });
  expect(revisionsSpy).toHaveBeenNthCalledWith(2, 42, 101);
});

it('수정 이력이 존재할 때 아코디언을 펼치면 이전 리비전 내역이 표시된다', async () => {
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(sampleRecord);
  vi.spyOn(recordsApi, 'getRecordRevisions').mockResolvedValue({
    items: [
      {
        revision: 1,
        changedBy: { id: 3, name: '이활동', role: 'SUPPORT_WORKER' },
        changedAt: '2026-10-22T12:15:00Z',
        content: '식사 1차 변경 기록',
        category: 'MEAL',
        recordedAt: '2026-10-22T12:00:00Z',
      },
    ],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });

  render(
    <MemoryRouter initialEntries={['/records/101']}>
      <Routes>
        <Route path="/records/:id" element={<RecordDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  const toggleBtn = await screen.findByRole('button', { name: /수정 내역 및 이력/ });
  fireEvent.click(toggleBtn);

  expect(await screen.findByText(/#1차 수정 · 이활동 \(활동지원사\)/)).toBeInTheDocument();
  expect(screen.getByText('식사 1차 변경 기록')).toBeInTheDocument();
});

it('기록 삭제는 브라우저 confirm 대신 인앱 확인창을 사용한다', async () => {
  HTMLDialogElement.prototype.showModal = vi.fn(function(this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function(this: HTMLDialogElement) { this.open = false; });
  const confirmSpy = vi.spyOn(window, 'confirm');
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(sampleRecord);
  render(<MemoryRouter initialEntries={['/records/101']}><Routes>
    <Route path="/records/:id" element={<RecordDetailPage />} />
  </Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '삭제' }));
  expect(confirmSpy).not.toHaveBeenCalled();
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});
