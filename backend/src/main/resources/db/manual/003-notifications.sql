-- 프로덕션 배포 전에 실행: 사용자 알림 설정과 인앱 알림
ALTER TABLE users
    ADD COLUMN record_created BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN record_updated BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN assignment_changed BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN suggestion_received BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN information_request_received BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN record_request_received BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE notification (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    type VARCHAR(40) NOT NULL,
    message VARCHAR(500) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_notification_user_id_created_at (user_id, created_at)
);
