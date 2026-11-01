package com.project.backend.organization.repository;

import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.OrganizationRecipientLink;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrganizationRecipientLinkRepository extends JpaRepository<OrganizationRecipientLink, Long> {
    List<OrganizationRecipientLink> findByCareRecipientId(Long careRecipientId);
    List<OrganizationRecipientLink> findByCareRecipientIdInAndStatus(List<Long> careRecipientIds, LinkStatus status);
    List<OrganizationRecipientLink> findByOrganizationId(Long organizationId);
    boolean existsByOrganizationIdAndCareRecipientIdAndStatus(
            Long organizationId, Long careRecipientId, LinkStatus status);
    Optional<OrganizationRecipientLink> findByOrganizationIdAndCareRecipientId(
            Long organizationId, Long careRecipientId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from OrganizationRecipientLink l where l.organizationId = :organizationId and l.careRecipientId = :careRecipientId")
    Optional<OrganizationRecipientLink> findByOrganizationIdAndCareRecipientIdForUpdate(
            @Param("organizationId") Long organizationId, @Param("careRecipientId") Long careRecipientId);
}
