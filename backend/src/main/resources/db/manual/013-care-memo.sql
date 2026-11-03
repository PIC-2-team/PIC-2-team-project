-- 프로덕션 배포 전에 실행: 당사자 메모(CareMemo) 테이블
-- 운영은 ddl-auto: validate라 테이블이 없으면 서버가 기동하지 못한다.
-- 이미 테이블이 있으면 아무 것도 하지 않는다.
CREATE TABLE IF NOT EXISTS care_memo (
    id BIGINT NOT NULL AUTO_INCREMENT,
    care_recipient_id BIGINT NOT NULL,
    created_by_id BIGINT NOT NULL,
    date DATE NOT NULL,
    content VARCHAR(500) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_care_memo_care_recipient_id_date (care_recipient_id, date)
);
