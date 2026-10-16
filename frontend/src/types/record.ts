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
  content: string;
  category: RecordCategory;
  recordedAt: string; // ISO 8601
};

export type CreateRecordPayload = {
  content: string;
  category: RecordCategory;
  recordedAt: string;
  pinned?: boolean;
};
