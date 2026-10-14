package com.project.backend.care.repository;

import com.project.backend.care.entity.CareAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CareAssignmentRepository extends JpaRepository<CareAssignment, Long> {
    List<CareAssignment> findByCareRecipientIdAndEndedAtIsNull(Long careRecipientId);
    boolean existsBySupportWorkerIdAndCareRecipientIdAndEndedAtIsNull(
            Long supportWorkerId, Long careRecipientId);
    boolean existsByIdempotencyKey(String idempotencyKey);
    Optional<CareAssignment> findBySupportWorkerIdAndCareRecipientIdAndEndedAtIsNull(
            Long supportWorkerId, Long careRecipientId);
}
