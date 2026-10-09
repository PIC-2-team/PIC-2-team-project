import type { PaginatedData } from '../types/common';
import { apiRequest } from './client';

export type RecordCategory = 'EMOTION' | 'SCHEDULE' | 'HEALTH' | 'MEAL' | 'SLEEP' | 'ETC';

export interface DailyRecord {
  id: number;
  category: RecordCategory;
  content: string;
  createdAt: string;
}

export interface CreateRecordPayload {
  category: RecordCategory;
  content: string;
}

export function getRecordsByDate(date: string): Promise<PaginatedData<DailyRecord>> {
  return apiRequest<PaginatedData<DailyRecord>>(
    `/api/records?date=${encodeURIComponent(date)}`
  );
}

export function createRecord(payload: CreateRecordPayload): Promise<DailyRecord> {
  return apiRequest<DailyRecord>('/api/records', { method: 'POST', body: payload });
}
