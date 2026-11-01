package com.project.backend.organization.repository;

import com.project.backend.organization.entity.OrganizationMember;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, Long> {
    List<OrganizationMember> findByOrganizationId(Long organizationId);
    List<OrganizationMember> findByOrganizationIdAndStatus(Long organizationId, OrganizationMemberStatus status);
    List<OrganizationMember> findByUserIdAndStatus(Long userId, OrganizationMemberStatus status);
    // 계정 잠금을 기다린 뒤 MySQL REPEATABLE READ에서도 최신 소속을 읽는다.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from OrganizationMember m where m.userId = :userId and m.status = :status")
    List<OrganizationMember> findByUserIdAndStatusForUpdate(@Param("userId") Long userId,
                                                            @Param("status") OrganizationMemberStatus status);
    Optional<OrganizationMember> findByOrganizationIdAndUserId(Long organizationId, Long userId);
    boolean existsByOrganizationIdAndUserIdAndStatus(Long organizationId, Long userId, OrganizationMemberStatus status);
}
