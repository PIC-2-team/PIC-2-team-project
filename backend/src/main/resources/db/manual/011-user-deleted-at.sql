-- 회원 탈퇴 계정 익명화 표시 컬럼 (이슈 #220, ADR-014)
-- 운영은 ddl-auto: validate라 컬럼이 없으면 서버가 기동하지 못한다.
-- 같은 SQL을 두 번 실행하면 ADD COLUMN에서 실패한다.
ALTER TABLE users
  ADD COLUMN deleted_at DATETIME(6) NULL;
