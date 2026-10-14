package com.project.backend.organization.repository;

import com.project.backend.organization.entity.OrganizationMember;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, Long> {
    List<OrganizationMember> findByOrganizationIdAndStatus(Long organizationId, OrganizationMemberStatus status);
    List<OrganizationMember> findByUserIdAndStatus(Long userId, OrganizationMemberStatus status);
    Optional<OrganizationMember> findByOrganizationIdAndUserId(Long organizationId, Long userId);
    boolean existsByOrganizationIdAndUserIdAndStatus(Long organizationId, Long userId, OrganizationMemberStatus status);
}
