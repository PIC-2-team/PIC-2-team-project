-- 당사자 프로필에 주치의·병원, 활동지원센터 정보를 추가한다. (이슈 #197, ADR-013)
-- 모두 선택 입력이라 NULL을 허용하며 기존 데이터는 변환 없이 NULL로 남는다.
ALTER TABLE care_recipient
  ADD COLUMN hospital_name VARCHAR(100) NULL,
  ADD COLUMN doctor_name VARCHAR(50) NULL,
  ADD COLUMN hospital_phone VARCHAR(30) NULL,
  ADD COLUMN support_center_name VARCHAR(100) NULL,
  ADD COLUMN support_center_manager_name VARCHAR(50) NULL,
  ADD COLUMN support_center_phone VARCHAR(30) NULL;
