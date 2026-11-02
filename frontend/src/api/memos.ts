import type { Memo, CreateMemoPayload, UpdateMemoPayload } from '../types/memo';
import { apiRequest } from './client';

export function getMemosByDate(recipientId: number, date: string): Promise<Memo[]> {
  return apiRequest(`/api/care-recipients/${recipientId}/memos?date=${date}`);
}

export function getMemosByMonth(recipientId: number, year: number, month: number): Promise<Memo[]> {
  return apiRequest(`/api/care-recipients/${recipientId}/memos/month?year=${year}&month=${month}`);
}

export function getTodayMemos(recipientId: number): Promise<Memo[]> {
  return apiRequest(`/api/care-recipients/${recipientId}/memos/today`);
}

export function createMemo(recipientId: number, payload: CreateMemoPayload): Promise<Memo> {
  return apiRequest(`/api/care-recipients/${recipientId}/memos`, {
    method: 'POST',
    body: payload,
  });
}

export function updateMemo(
  recipientId: number,
  memoId: number,
  payload: UpdateMemoPayload,
): Promise<Memo> {
  return apiRequest(`/api/care-recipients/${recipientId}/memos/${memoId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteMemo(recipientId: number, memoId: number): Promise<void> {
  return apiRequest(`/api/care-recipients/${recipientId}/memos/${memoId}`, {
    method: 'DELETE',
  });
}
