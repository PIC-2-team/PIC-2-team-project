-- 당사자 루틴 테이블 (이슈 #197, ADR-013)
-- 운영은 ddl-auto: validate라 테이블이 없으면 서버가 기동하지 못한다.
-- 이미 테이블이 있으면 아무 것도 하지 않는다.
CREATE TABLE IF NOT EXISTS care_recipient_routine (
    id BIGINT NOT NULL AUTO_INCREMENT,
    care_recipient_id BIGINT NOT NULL,
    routine_time TIME NOT NULL,
    title VARCHAR(100) NOT NULL,
    memo VARCHAR(500) NULL,
    PRIMARY KEY (id),
    KEY idx_care_recipient_routine_recipient_time (care_recipient_id, routine_time)
);
