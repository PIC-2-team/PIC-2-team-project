-- 프로덕션 배포 전에 실행: RecordMedia 및 생활기록 첨부 테이블
CREATE TABLE record_media (
    id BIGINT NOT NULL AUTO_INCREMENT,
    care_recipient_id BIGINT NOT NULL,
    uploader_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    media_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_record_media_s3_key (s3_key),
    KEY idx_record_media_care_recipient_id (care_recipient_id)
);

CREATE TABLE record_media_link (
    id BIGINT NOT NULL AUTO_INCREMENT,
    record_id BIGINT NOT NULL,
    media_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_record_media_link_record_media (record_id, media_id),
    KEY idx_record_media_link_media_id (media_id)
);
