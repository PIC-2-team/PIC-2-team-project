-- 운영 DB 적용 전 중복 연결은 가장 먼저 생성된 행만 유지한다.
DELETE duplicate_link FROM organization_guardian_link duplicate_link
JOIN organization_guardian_link original_link
  ON duplicate_link.organization_id = original_link.organization_id
 AND duplicate_link.guardian_id = original_link.guardian_id
 AND duplicate_link.id > original_link.id;

ALTER TABLE organization_guardian_link
  ADD CONSTRAINT uk_organization_guardian_link_org_guardian
  UNIQUE (organization_id, guardian_id);
