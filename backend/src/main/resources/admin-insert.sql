-- 삶결 슈퍼어드민 계정 생성
-- 비밀번호: Admin1234!  (BCrypt 해시)
-- 실행 전: public_code 중복 여부 확인 필요

INSERT INTO users (
  name, email, password, role, public_code, created_at,
  record_created, record_updated, assignment_changed,
  suggestion_received, information_request_received, record_request_received
) VALUES (
  '관리자',
  'admin@samgyeol.com',
  '$2b$12$HrO.nnT0cBMjNVOk.ZAVzOGnRh1q37i7xqVm5u2YNMgMvp5BIzOZq',
  'ADMIN',
  'ADMIN-0001',
  NOW(),
  true, true, true, true, true, true
);
