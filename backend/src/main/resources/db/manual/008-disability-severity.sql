-- 장애 정도를 숫자 급수에서 심한 장애 / 심하지 않은 장애로 전환한다. (이슈 #197, ADR-013)
-- 1~3급은 SEVERE, 4급 이상은 NOT_SEVERE, 그 외(NULL, 0 이하)는 NULL로 변환한다.
--
-- disability_grade 컬럼은 삭제하지 않고 남긴다. 구버전 서버와 호환되어 배포 순서에 상관없이
-- 기동하고, 문제가 생기면 이전 버전으로 되돌릴 수 있다. 새 서버가 안정된 뒤 별도 SQL로 삭제한다.
-- 이 SQL을 적용한 뒤 새 서버를 바로 배포한다 (그 사이 구버전에서 수정한 급수는 새 컬럼에 반영되지 않는다).
-- 같은 SQL을 두 번 실행하면 ADD COLUMN에서 실패한다.
ALTER TABLE care_recipient
  ADD COLUMN disability_severity VARCHAR(20) NULL;

UPDATE care_recipient
SET disability_severity = CASE
  WHEN disability_grade BETWEEN 1 AND 3 THEN 'SEVERE'
  WHEN disability_grade >= 4 THEN 'NOT_SEVERE'
  ELSE NULL
END;
