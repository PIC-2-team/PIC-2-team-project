import type { DailyRecord, CreateRecordPayload, RecordCategory } from '../types/record';
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

export type RecordDraft = {
  transcript: string;
  content: string;
  category: RecordCategory;
};

export function createRecordDraft(
  recipientId: number,
  input: { inputType: 'TEXT'; text: string } | { inputType: 'AUDIO'; mediaId: number },
): Promise<RecordDraft> {
  return apiRequest('/api/ai/record-drafts', {
    method: 'POST',
    body: { careRecipientId: recipientId, ...input },
  });
}

export function uploadRecordAudio(recipientId: number, file: File): Promise<{ mediaId: number }> {
  const form = new FormData();
  form.append('file', file);
  return apiRequest(`/api/care-recipients/${recipientId}/media`, { method: 'POST', body: form });
}

export function deleteRecordMedia(recipientId: number, mediaId: number): Promise<{ deleted: boolean }> {
  return apiRequest(`/api/care-recipients/${recipientId}/media/${mediaId}`, { method: 'DELETE' });
}

export type RecordSuggestion = {
  id: number;
  suggestedContent: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

export function createSuggestion(
  recipientId: number,
  recordId: number,
  suggestedContent: string,
): Promise<RecordSuggestion> {
  return apiRequest(`/api/care-recipients/${recipientId}/records/${recordId}/suggestions`, {
    method: 'POST',
    body: { suggestedContent },
  });
}
