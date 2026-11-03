-- 기관이 소속 활동지원사에 대해 작성하는 특성 메모
-- 운영은 ddl-auto: validate라 서버 배포 전 컬럼 추가가 필요하다.
ALTER TABLE organization_member
  ADD COLUMN characteristics VARCHAR(2000) NULL;
