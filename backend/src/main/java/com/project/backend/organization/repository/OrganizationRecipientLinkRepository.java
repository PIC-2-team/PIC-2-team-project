package com.project.backend.organization.repository;

import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.OrganizationRecipientLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrganizationRecipientLinkRepository extends JpaRepository<OrganizationRecipientLink, Long> {
    List<OrganizationRecipientLink> findByCareRecipientId(Long careRecipientId);
    List<OrganizationRecipientLink> findByOrganizationId(Long organizationId);
    boolean existsByOrganizationIdAndCareRecipientIdAndStatus(
            Long organizationId, Long careRecipientId, LinkStatus status);
    Optional<OrganizationRecipientLink> findByOrganizationIdAndCareRecipientId(
            Long organizationId, Long careRecipientId);
}
