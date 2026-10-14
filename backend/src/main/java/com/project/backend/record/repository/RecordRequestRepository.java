package com.project.backend.record.repository;

import com.project.backend.record.entity.RecordRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecordRequestRepository extends JpaRepository<RecordRequest, Long> {
    Optional<RecordRequest> findByIdempotencyKey(String idempotencyKey);
    List<RecordRequest> findByCareRecipientId(Long careRecipientId);
    List<RecordRequest> findBySupportWorkerId(Long supportWorkerId);
}
