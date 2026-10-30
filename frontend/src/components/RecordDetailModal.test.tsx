import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RecordDetailModal } from './RecordDetailModal';
import * as recordsApi from '../api/records';
import type { DailyRecord } from '../types/record';

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

const emptyRevisions = { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };

beforeEach(() => {
  mockRole = 'GUARDIAN';
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(sampleRecord);
  vi.spyOn(recordsApi, 'getRecordRevisions').mockResolvedValue(emptyRevisions);
  HTMLDialogElement.prototype.showModal = vi.fn(function(this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function(this: HTMLDialogElement) { this.open = false; });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('기록 상세를 모달로 표시하고 닫으면 변경 없이 돌아간다', async () => {
  const onClose = vi.fn();
  render(<RecordDetailModal recordId={101} onClose={onClose} />);

  expect(await screen.findByRole('dialog', { name: '기록 상세' })).toBeInTheDocument();
  expect(screen.getByText(sampleRecord.content)).toBeInTheDocument();
  expect(screen.getByText('식사')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '기록 상세 닫기' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: '기록 상세 닫기' }));
  expect(onClose).toHaveBeenCalledWith(false);
});

it('Escape 키로 모달을 닫고 Tab 이동을 모달 안에 유지한다', async () => {
  const onClose = vi.fn();
  render(<RecordDetailModal recordId={101} onClose={onClose} />);
  const dialog = await screen.findByRole('dialog', { name: '기록 상세' });
  const closeButton = screen.getByRole('button', { name: '기록 상세 닫기' });
  fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
  expect(screen.getByRole('button', { name: /수정 내역 및 이력/ })).toHaveFocus();
  closeButton.focus();
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledWith(false);
});

it('본인 기록을 수정하면 모달 내용과 이력을 갱신하고 닫을 때 목록 변경을 알린다', async () => {
  const onClose = vi.fn();
  const update = vi.spyOn(recordsApi, 'updateRecord').mockResolvedValue({
    ...sampleRecord, content: '수정된 기록입니다.', category: 'LIFESTYLE',
  });
  const revisions = vi.mocked(recordsApi.getRecordRevisions);
  render(<RecordDetailModal recordId={101} onClose={onClose} />);

  fireEvent.click(await screen.findByRole('button', { name: '수정' }));
  fireEvent.click(screen.getByRole('button', { name: '생활습관' }));
  fireEvent.change(screen.getByRole('textbox', { name: '기록 내용 수정' }), { target: { value: '수정된 기록입니다.' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));

  await waitFor(() => expect(update).toHaveBeenCalledWith(42, 101, {
    content: '수정된 기록입니다.', category: 'LIFESTYLE',
  }));
  expect(await screen.findByText('수정된 기록입니다.')).toBeInTheDocument();
  await waitFor(() => expect(revisions).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('button', { name: '기록 상세 닫기' }));
  expect(onClose).toHaveBeenCalledWith(true);
});

it('수정 취소 시 원래 내용을 유지한다', async () => {
  render(<RecordDetailModal recordId={101} onClose={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: '수정' }));
  fireEvent.change(screen.getByRole('textbox', { name: '기록 내용 수정' }), { target: { value: '취소할 내용' } });
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(screen.getByText(sampleRecord.content)).toBeInTheDocument();
  expect(screen.queryByText('취소할 내용')).not.toBeInTheDocument();
});

it('활동지원사와 보호자는 타인 기록을 수정하거나 삭제할 수 없다', async () => {
  mockRole = 'SUPPORT_WORKER';
  render(<RecordDetailModal recordId={101} onClose={vi.fn()} />);
  expect(await screen.findByText(sampleRecord.content)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
});

it('본인 기록 삭제 후 모달을 닫고 목록 변경을 알린다', async () => {
  const onClose = vi.fn();
  const remove = vi.spyOn(recordsApi, 'deleteRecord').mockResolvedValue({
    deletedAt: '2026-10-22T12:30:00Z', restoreUntil: '2026-11-21T12:30:00Z',
  });
  render(<RecordDetailModal recordId={101} onClose={onClose} />);
  fireEvent.click(await screen.findByRole('button', { name: '삭제' }));
  fireEvent.click(screen.getByRole('alertdialog').querySelectorAll('button')[1]);
  await waitFor(() => expect(remove).toHaveBeenCalledWith(42, 101));
  expect(onClose).toHaveBeenCalledWith(true);
});

it('수정 이력을 펼치면 이전 내용을 볼 수 있다', async () => {
  vi.mocked(recordsApi.getRecordRevisions).mockResolvedValue({
    items: [{
      revision: 1,
      changedBy: { id: 3, name: '이활동', role: 'SUPPORT_WORKER' },
      changedAt: '2026-10-22T12:15:00Z',
      content: '식사 1차 변경 기록', category: 'MEAL', recordedAt: '2026-10-22T12:00:00Z',
    }],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });
  render(<RecordDetailModal recordId={101} onClose={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: /수정 내역 및 이력/ }));
  expect(await screen.findByText('식사 1차 변경 기록')).toBeInTheDocument();
});
