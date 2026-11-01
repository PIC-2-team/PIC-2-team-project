// 기록 분류 — 기존 코드 기준 8개 값 (API-Spec.md §기록 분류 미결).
// 백엔드 최종 합의 후 이 파일과 RecordFormPage.tsx CATEGORIES 배열만 수정.
export type RecordCategory =
  | 'COMMUNICATION'
  | 'LIFESTYLE'
  | 'MEAL'
  | 'PREFERENCE'
  | 'CHALLENGING_BEHAVIOR'
  | 'HEALTH'
  | 'EMERGENCY'
  | 'OTHER';

export type DailyRecord = {
  id: number;
  author?: { id: number; name: string; role: string; publicCode?: string };
  content: string;
  category: RecordCategory;
  recordedAt: string; // ISO 8601
  pinned?: boolean;
};

export type DeletedRecord = Pick<DailyRecord, 'id' | 'content' | 'category' | 'recordedAt'> & {
  deletedAt: string;
  restoreUntil: string;
};

export type CreateRecordPayload = {
  content: string;
  category: RecordCategory;
  recordedAt: string;
  pinned?: boolean;
};

export type UpdateRecordPayload = {
  content?: string;
  category?: RecordCategory;
  recordedAt?: string;
  mediaIds?: number[];
};

export type RecordRevision = {
  revision: number;
  changedBy: {
    id: number;
    name: string;
    role: string;
  };
  changedAt: string;
  content: string;
  category: RecordCategory;
  recordedAt: string;
};
