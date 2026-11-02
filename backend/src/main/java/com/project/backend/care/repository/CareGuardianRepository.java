package com.project.backend.care.repository;

import com.project.backend.care.entity.CareGuardian;
import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.entity.GuardianType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CareGuardianRepository extends JpaRepository<CareGuardian, Long> {
    List<CareGuardian> findByGuardianId(Long guardianId);
    // 탈퇴 처리가 일반 조회로 스냅샷을 고정하기 전에 잠금 조회로 읽어, 동시 탈퇴의 커밋 결과를 반영한다
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from CareGuardian g where g.guardianId = :guardianId and g.status <> com.project.backend.care.entity.GuardianStatus.REVOKED")
    List<CareGuardian> findLiveByGuardianIdForUpdate(@Param("guardianId") Long guardianId);
    List<CareGuardian> findByCareRecipientIdAndStatus(Long careRecipientId, GuardianStatus status);
    List<CareGuardian> findByGuardianIdAndStatus(Long guardianId, GuardianStatus status);
    List<CareGuardian> findByGuardianIdInAndStatus(List<Long> guardianIds, GuardianStatus status);
    Optional<CareGuardian> findByCareRecipientIdAndGuardianIdAndStatus(
            Long careRecipientId, Long guardianId, GuardianStatus status);
    Optional<CareGuardian> findByCareRecipientIdAndGuardianIdAndType(
            Long careRecipientId, Long guardianId, GuardianType type);
    boolean existsByCareRecipientIdAndGuardianIdAndStatus(
            Long careRecipientId, Long guardianId, GuardianStatus status);
    boolean existsByCareRecipientIdAndGuardianIdAndTypeAndStatus(
            Long careRecipientId, Long guardianId, GuardianType type, GuardianStatus status);
    Optional<CareGuardian> findByInvitationToken(String token);
    Optional<CareGuardian> findByCareRecipientIdAndTypeAndStatus(
            Long careRecipientId, GuardianType type, GuardianStatus status);
    List<CareGuardian> findByCareRecipientIdInAndTypeAndStatus(
            List<Long> careRecipientIds, GuardianType type, GuardianStatus status);
    List<CareGuardian> findByCareRecipientIdAndType(Long careRecipientId, GuardianType type);
}
