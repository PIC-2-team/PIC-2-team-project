import type { DailyRecord, CreateRecordPayload, UpdateRecordPayload, RecordCategory, RecordRequestItem, RecordRevision } from '../types/record';
import type { PaginatedData } from '../types/common';
import { apiRequest } from './client';

export function getTodayRecords(recipientId: number): Promise<DailyRecord[]> {
  return apiRequest(`/api/care-recipients/${recipientId}/records/today`);
}

export function getRecordsByMonth(
  recipientId: number,
  year: number,
  month: number,
  category?: RecordCategory
): Promise<PaginatedData<DailyRecord>> {
  const query = category ? `&category=${category}` : '';
  return apiRequest(
    `/api/care-recipients/${recipientId}/records?year=${year}&month=${month}&pageSize=100${query}`
  );
}

export function getRecords(
  recipientId: number,
  category?: RecordCategory,
  page = 1,
): Promise<PaginatedData<DailyRecord>> {
  const filter = category ? `&category=${category}` : '';
  return apiRequest(`/api/care-recipients/${recipientId}/records?page=${page}&pageSize=20${filter}`);
}

export function getRecordsByCategory(
  recipientId: number,
  category: RecordCategory,
  page = 1,
  pageSize = 50
): Promise<PaginatedData<DailyRecord>> {
  return apiRequest(
    `/api/care-recipients/${recipientId}/records?category=${category}&page=${page}&pageSize=${pageSize}`
  );
}

export function pinRecord(
  recipientId: number,
  recordId: number,
  pinned: boolean
): Promise<DailyRecord> {
  return apiRequest(`/api/care-recipients/${recipientId}/records/${recordId}/pin`, {
    method: 'PATCH',
    body: { pinned },
  });
}

export function getRecord(recipientId: number, recordId: number): Promise<DailyRecord> {
  return apiRequest(`/api/care-recipients/${recipientId}/records/${recordId}`);
}

export function updateRecord(
  recipientId: number,
  recordId: number,
  payload: UpdateRecordPayload
): Promise<DailyRecord> {
  return apiRequest(`/api/care-recipients/${recipientId}/records/${recordId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteRecord(
  recipientId: number,
  recordId: number
): Promise<{ deletedAt: string; restoreUntil: string }> {
  return apiRequest(`/api/care-recipients/${recipientId}/records/${recordId}`, {
    method: 'DELETE',
  });
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

export type RecordSuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type RecordSuggestion = {
  id: number;
  recordId?: number;
  original?: {
    content: string;
    category?: RecordCategory;
  };
  proposed?: {
    content: string;
    category?: RecordCategory;
  };
  reason?: string | null;
  suggestedBy?: {
    id: number;
    name: string;
    role: string;
  };
  status: RecordSuggestionStatus;
  createdAt?: string;
  suggestedContent?: string;
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

export function createRecordRequest(
  recipientId: number,
  message: string,
  idempotencyKey: string = crypto.randomUUID()
): Promise<RecordRequestItem> {
  return apiRequest(`/api/care-recipients/${recipientId}/record-requests`, {
    method: 'POST',
    body: { idempotencyKey, message },
  });
}

export function getMyRecordRequests(): Promise<RecordRequestItem[]> {
  return apiRequest('/api/record-requests/mine');
}

export function getRecipientRecordRequests(recipientId: number): Promise<RecordRequestItem[]> {
  return apiRequest(`/api/care-recipients/${recipientId}/record-requests`);
}

export function cancelRecordRequest(recipientId: number, requestId: number): Promise<void> {
  return apiRequest(`/api/care-recipients/${recipientId}/record-requests/${requestId}/cancel`, {
    method: 'POST',
  });
}

export function getRecordSuggestions(
  recipientId: number,
  status: RecordSuggestionStatus = 'PENDING',
  page = 1,
  pageSize = 20,
  recordId?: number
): Promise<PaginatedData<RecordSuggestion>> {
  return apiRequest(
    `/api/care-recipients/${recipientId}/record-suggestions?status=${status}&page=${page}&pageSize=${pageSize}${recordId === undefined ? '' : `&recordId=${recordId}`}`
  );
}

export function decideRecordSuggestion(
  recipientId: number,
  suggestionId: number,
  decision: 'APPROVE' | 'REJECT'
): Promise<RecordSuggestion> {
  return apiRequest(
    `/api/care-recipients/${recipientId}/record-suggestions/${suggestionId}/decision`,
    {
      method: 'POST',
      body: { decision },
    }
  );
}

export function getRecordRevisions(
  recipientId: number,
  recordId: number,
  page = 1,
  pageSize = 20
): Promise<PaginatedData<RecordRevision>> {
  return apiRequest(
    `/api/care-recipients/${recipientId}/records/${recordId}/revisions?page=${page}&pageSize=${pageSize}`
  );
}
