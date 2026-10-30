package com.project.backend.care.repository;

import com.project.backend.care.entity.CareAssignment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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
              and exists (select m.id from OrganizationMember m
                          where m.organizationId = a.organizationId and m.userId = :userId
                            and m.status = com.project.backend.organization.entity.OrganizationMemberStatus.ACTIVE)
            """)
    boolean hasCurrentAssignment(Long userId, Long recipientId, LocalDate today);

    List<CareAssignment> findByCareRecipientIdAndEndedAtIsNull(Long careRecipientId);
    @Query("""
            select a from CareAssignment a where a.supportWorkerId = :supportWorkerId
              and a.endedAt is null
              and exists (select m.id from OrganizationMember m
                          where m.organizationId = a.organizationId and m.userId = :supportWorkerId
                            and m.status = com.project.backend.organization.entity.OrganizationMemberStatus.ACTIVE)
            """)
    List<CareAssignment> findBySupportWorkerIdAndEndedAtIsNull(Long supportWorkerId);
    List<CareAssignment> findByOrganizationId(Long organizationId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select a from CareAssignment a
            where a.organizationId = :organizationId and a.supportWorkerId = :supportWorkerId
              and a.endedAt is null
            """)
    List<CareAssignment> findByOrganizationIdAndSupportWorkerIdAndEndedAtIsNull(Long organizationId, Long supportWorkerId);
    List<CareAssignment> findByOrganizationIdAndCareRecipientId(Long organizationId, Long careRecipientId);
    @Query("""
            select (count(a) > 0) from CareAssignment a
            where a.supportWorkerId = :supportWorkerId and a.careRecipientId = :careRecipientId
              and a.endedAt is null
              and exists (select m.id from OrganizationMember m
                          where m.organizationId = a.organizationId and m.userId = :supportWorkerId
                            and m.status = com.project.backend.organization.entity.OrganizationMemberStatus.ACTIVE)
            """)
    boolean existsBySupportWorkerIdAndCareRecipientIdAndEndedAtIsNull(
            Long supportWorkerId, Long careRecipientId);
    boolean existsByIdempotencyKey(String idempotencyKey);
    @Query("""
            select a from CareAssignment a
            where a.supportWorkerId = :supportWorkerId and a.careRecipientId = :careRecipientId
              and a.endedAt is null
              and exists (select m.id from OrganizationMember m
                          where m.organizationId = a.organizationId and m.userId = :supportWorkerId
                            and m.status = com.project.backend.organization.entity.OrganizationMemberStatus.ACTIVE)
            """)
    Optional<CareAssignment> findBySupportWorkerIdAndCareRecipientIdAndEndedAtIsNull(
            Long supportWorkerId, Long careRecipientId);
}
