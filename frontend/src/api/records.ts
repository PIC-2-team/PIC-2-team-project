import type { DailyRecord, CreateRecordPayload } from '../types/record';
import type { PaginatedData } from '../types/common';
import { apiRequest } from './client';

export function getTodayRecords(recipientId: number): Promise<DailyRecord[]> {
  return apiRequest(`/api/care-recipients/${recipientId}/records/today`);
}

export function getRecordsByMonth(
  recipientId: number,
  year: number,
  month: number
): Promise<PaginatedData<DailyRecord>> {
  return apiRequest(
    `/api/care-recipients/${recipientId}/records?year=${year}&month=${month}&pageSize=100`
  );
}

// TODO: GET /records/{recordId} — 경로 초안, 미구현 (API-Spec.md §상세·수정·삭제)
export function getRecord(recipientId: number, recordId: number): Promise<DailyRecord> {
  return apiRequest(`/api/care-recipients/${recipientId}/records/${recordId}`);
}

export function createRecord(
  recipientId: number,
  payload: CreateRecordPayload
): Promise<DailyRecord> {
  return apiRequest(`/api/care-recipients/${recipientId}/records`, {
    method: 'POST',
    body: payload,
  });
}
