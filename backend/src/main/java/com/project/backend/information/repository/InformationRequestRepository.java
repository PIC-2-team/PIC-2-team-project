package com.project.backend.information.repository;

import com.project.backend.information.entity.InformationRequest;
import com.project.backend.information.entity.InformationRequestStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.Optional;

public interface InformationRequestRepository extends JpaRepository<InformationRequest, Long> {
    @Query(value = """
            select r from InformationRequest r
            where r.requestedById = :userId
              and (:status is null or r.status = :status)
              and exists (select m.id from OrganizationMember m
                          where m.organizationId = r.organizationId and m.userId = :userId
                            and m.status = com.project.backend.organization.entity.OrganizationMemberStatus.ACTIVE)
            """, countQuery = """
            select count(r) from InformationRequest r
            where r.requestedById = :userId
              and (:status is null or r.status = :status)
              and exists (select m.id from OrganizationMember m
                          where m.organizationId = r.organizationId and m.userId = :userId
                            and m.status = com.project.backend.organization.entity.OrganizationMemberStatus.ACTIVE)
            """)
    Page<InformationRequest> findVisibleByRequester(@Param("userId") Long userId,
            @Param("status") InformationRequestStatus status, Pageable pageable);
    Page<InformationRequest> findByOrganizationIdAndStatus(Long organizationId, InformationRequestStatus status, Pageable pageable);
    Page<InformationRequest> findByOrganizationId(Long organizationId, Pageable pageable);
    Page<InformationRequest> findByCareRecipientIdAndStatus(Long recipientId, InformationRequestStatus status, Pageable pageable);
    Page<InformationRequest> findByCareRecipientId(Long recipientId, Pageable pageable);
    Page<InformationRequest> findByCareRecipientIdAndStatusIn(Long recipientId,
            Collection<InformationRequestStatus> statuses, Pageable pageable);
    Page<InformationRequest> findByCareRecipientIdAndStatusInAndStatus(Long recipientId,
            Collection<InformationRequestStatus> statuses, InformationRequestStatus status, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from InformationRequest r where r.id = :id")
    Optional<InformationRequest> findForUpdate(@Param("id") Long id);
}
