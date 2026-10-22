package com.project.backend.organization.repository;

import com.project.backend.organization.entity.OrganizationGuardianLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrganizationGuardianLinkRepository extends JpaRepository<OrganizationGuardianLink, Long> {
    List<OrganizationGuardianLink> findByOrganizationId(Long organizationId);
    List<OrganizationGuardianLink> findByGuardianId(Long guardianId);
    Optional<OrganizationGuardianLink> findByOrganizationIdAndGuardianId(Long organizationId, Long guardianId);
    boolean existsByOrganizationIdAndGuardianId(Long organizationId, Long guardianId);
    void deleteByOrganizationIdAndGuardianId(Long organizationId, Long guardianId);
}
