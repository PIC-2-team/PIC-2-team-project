-- 프로덕션 배포 전에 실행: 생활기록 수정 제안
CREATE TABLE record_suggestion (
    id BIGINT NOT NULL AUTO_INCREMENT,
    care_recipient_id BIGINT NOT NULL,
    record_id BIGINT NOT NULL,
    suggested_by_id BIGINT NOT NULL,
    original_content VARCHAR(500) NOT NULL,
    original_category VARCHAR(30) NOT NULL,
    original_updated_at TIMESTAMP(6) NOT NULL,
    proposed_content VARCHAR(500) NOT NULL,
    proposed_category VARCHAR(30) NOT NULL,
    reason VARCHAR(1000),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_record_suggestion_care_recipient_id_status_created_at (care_recipient_id, status, created_at)
);
