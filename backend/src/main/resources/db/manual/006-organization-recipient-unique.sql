-- 운영 DB 적용 전 중복 연결은 ACCEPTED, PENDING, REJECTED 순으로 우선하여 하나만 유지한다.
DELETE duplicate_link FROM organization_recipient_link duplicate_link
JOIN organization_recipient_link retained_link
  ON duplicate_link.organization_id = retained_link.organization_id
 AND duplicate_link.care_recipient_id = retained_link.care_recipient_id
 AND (
   CASE duplicate_link.status WHEN 'ACCEPTED' THEN 3 WHEN 'PENDING' THEN 2 ELSE 1 END
     < CASE retained_link.status WHEN 'ACCEPTED' THEN 3 WHEN 'PENDING' THEN 2 ELSE 1 END
   OR (
     duplicate_link.status = retained_link.status
     AND duplicate_link.id > retained_link.id
   )
 );

ALTER TABLE organization_recipient_link
  ADD CONSTRAINT uk_organization_recipient_link_org_recipient
  UNIQUE (organization_id, care_recipient_id);
