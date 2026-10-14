// TODO: 카테고리 enum, content 스키마 미확정 (API-Spec.md §CareInfo). 변경 시 이 파일만 수정.
export type CareInfoCategory =
  | 'COMMUNICATION'
  | 'PREFERENCE'
  | 'LIFESTYLE'
  | 'HEALTH_MEDICATION'
  | 'PRECAUTION'
  | 'EMERGENCY';

export type CareInfo = {
  category: CareInfoCategory;
  content: unknown; // 스키마 미확정 — 확정 후 구체적 타입으로 교체
  updatedAt: string;
};
