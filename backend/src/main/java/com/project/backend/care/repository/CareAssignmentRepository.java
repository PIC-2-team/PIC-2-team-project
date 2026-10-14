package com.project.backend.care.repository;

import com.project.backend.care.entity.CareAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;

import java.util.List;
import java.util.Optional;

public interface CareAssignmentRepository extends JpaRepository<CareAssignment, Long> {
    @Query("""
            select (count(a) > 0) from CareAssignment a
            where a.supportWorkerId = :userId and a.careRecipientId = :recipientId
              and a.endedAt is null and a.startDate <= :today
              and (a.endDate is null or a.endDate >= :today)
            """)
    boolean hasCurrentAssignment(Long userId, Long recipientId, LocalDate today);

    List<CareAssignment> findByCareRecipientIdAndEndedAtIsNull(Long careRecipientId);
    List<CareAssignment> findBySupportWorkerIdAndEndedAtIsNull(Long supportWorkerId);
    List<CareAssignment> findByOrganizationId(Long organizationId);
    List<CareAssignment> findByOrganizationIdAndCareRecipientId(Long organizationId, Long careRecipientId);
    boolean existsBySupportWorkerIdAndCareRecipientIdAndEndedAtIsNull(
            Long supportWorkerId, Long careRecipientId);
    boolean existsByIdempotencyKey(String idempotencyKey);
    Optional<CareAssignment> findBySupportWorkerIdAndCareRecipientIdAndEndedAtIsNull(
            Long supportWorkerId, Long careRecipientId);
}
