-- 장애 정도를 숫자 급수에서 심한 장애 / 심하지 않은 장애로 전환한다. (이슈 #197, ADR-013)
-- 운영 DB 적용 전 care_recipient 테이블을 백업한다. 변환 후 원래 급수는 복구할 수 없다.
-- 1~3급은 SEVERE, 4급 이상은 NOT_SEVERE, 그 외(NULL, 0 이하)는 NULL로 변환한다.
ALTER TABLE care_recipient
  ADD COLUMN disability_severity VARCHAR(20) NULL;

UPDATE care_recipient
SET disability_severity = CASE
  WHEN disability_grade BETWEEN 1 AND 3 THEN 'SEVERE'
  WHEN disability_grade >= 4 THEN 'NOT_SEVERE'
  ELSE NULL
END;

ALTER TABLE care_recipient
  DROP COLUMN disability_grade;
