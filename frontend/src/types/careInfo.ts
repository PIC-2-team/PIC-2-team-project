import type { DailyRecord, RecordCategory } from './record';

// CareInfo와 Record 카테고리를 통일 — 변경 시 RecordCategory만 수정
export type CareInfoCategory = RecordCategory;

export type CareInfo = {
  category: CareInfoCategory;
  content: unknown; // 스키마 미확정 — 확정 후 구체적 타입으로 교체
  updatedAt: string | null;
};

export type CareInfoOverview = {
  categories: CareInfo[];
  pinnedRecords: DailyRecord[];
};
