package com.project.backend.organization.repository;

import com.project.backend.organization.entity.OrganizationGuardianLink;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrganizationGuardianLinkRepository extends JpaRepository<OrganizationGuardianLink, Long> {
    List<OrganizationGuardianLink> findByOrganizationId(Long organizationId);
    List<OrganizationGuardianLink> findByGuardianId(Long guardianId);
    Optional<OrganizationGuardianLink> findByOrganizationIdAndGuardianId(Long organizationId, Long guardianId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from OrganizationGuardianLink l where l.organizationId = :organizationId and l.guardianId = :guardianId")
    List<OrganizationGuardianLink> findByOrganizationIdAndGuardianIdForUpdate(
            @Param("organizationId") Long organizationId, @Param("guardianId") Long guardianId);
    boolean existsByOrganizationIdAndGuardianId(Long organizationId, Long guardianId);
    void deleteByOrganizationIdAndGuardianId(Long organizationId, Long guardianId);
}
