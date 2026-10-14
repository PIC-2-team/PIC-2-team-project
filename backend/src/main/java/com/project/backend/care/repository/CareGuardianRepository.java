package com.project.backend.care.repository;

import com.project.backend.care.entity.CareGuardian;
import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.entity.GuardianType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CareGuardianRepository extends JpaRepository<CareGuardian, Long> {
    List<CareGuardian> findByCareRecipientIdAndStatus(Long careRecipientId, GuardianStatus status);
    List<CareGuardian> findByGuardianIdAndStatus(Long guardianId, GuardianStatus status);
    Optional<CareGuardian> findByCareRecipientIdAndGuardianIdAndStatus(
            Long careRecipientId, Long guardianId, GuardianStatus status);
    Optional<CareGuardian> findByCareRecipientIdAndGuardianIdAndType(
            Long careRecipientId, Long guardianId, GuardianType type);
    boolean existsByCareRecipientIdAndGuardianIdAndStatus(
            Long careRecipientId, Long guardianId, GuardianStatus status);
    Optional<CareGuardian> findByInvitationToken(String token);
    Optional<CareGuardian> findByCareRecipientIdAndTypeAndStatus(
            Long careRecipientId, GuardianType type, GuardianStatus status);
    List<CareGuardian> findByCareRecipientIdAndType(Long careRecipientId, GuardianType type);
}
