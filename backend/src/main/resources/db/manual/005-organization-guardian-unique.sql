-- 중복 연결 행을 삭제하므로 먼저 백업 테이블을 만든다. 적용 결과를 확인한 뒤 백업 테이블을 직접 삭제한다.
CREATE TABLE organization_guardian_link_backup_005 AS SELECT * FROM organization_guardian_link;

-- 운영 DB 적용 전 중복 연결은 가장 먼저 생성된 행만 유지한다.
DELETE duplicate_link FROM organization_guardian_link duplicate_link
JOIN organization_guardian_link original_link
  ON duplicate_link.organization_id = original_link.organization_id
 AND duplicate_link.guardian_id = original_link.guardian_id
 AND duplicate_link.id > original_link.id;

ALTER TABLE organization_guardian_link
  ADD CONSTRAINT uk_organization_guardian_link_org_guardian
  UNIQUE (organization_id, guardian_id);
