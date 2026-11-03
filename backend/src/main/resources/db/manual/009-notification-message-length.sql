-- 기존 알림 메시지 컬럼을 정보 요청 본문(최대 1,000자) 저장에 맞게 확장
ALTER TABLE notification
    MODIFY message VARCHAR(1000) NOT NULL;
