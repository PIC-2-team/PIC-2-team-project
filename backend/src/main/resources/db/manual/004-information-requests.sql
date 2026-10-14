CREATE TABLE information_request (
    id BIGINT NOT NULL AUTO_INCREMENT,
    care_recipient_id BIGINT NOT NULL,
    requested_by_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    message VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL,
    replied_by_id BIGINT NULL,
    reply_message VARCHAR(1000) NULL,
    replied_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_information_request_requester (requested_by_id, status, created_at),
    INDEX idx_information_request_organization (organization_id, status, created_at),
    INDEX idx_information_request_recipient (care_recipient_id, status, created_at)
);
