package com.project.backend.organization.repository;

import com.project.backend.organization.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {
    Optional<Organization> findByOwnerId(Long ownerId);
    Optional<Organization> findByOrganizationCode(String organizationCode);
    boolean existsByOrganizationCode(String organizationCode);
    List<Organization> findAllByOrderByCreatedAtDesc();
}
