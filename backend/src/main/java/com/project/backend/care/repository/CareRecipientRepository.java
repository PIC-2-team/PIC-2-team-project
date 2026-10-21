package com.project.backend.care.repository;

import com.project.backend.care.entity.CareRecipient;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface CareRecipientRepository extends JpaRepository<CareRecipient, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from CareRecipient r where r.id = :id")
    Optional<CareRecipient> findForUpdate(Long id);

    boolean existsByCareRecipientNumber(String careRecipientNumber);

    Optional<CareRecipient> findByCareRecipientNumber(String careRecipientNumber);

    java.util.List<CareRecipient> findAllByOrderByCreatedAtDesc();

    java.util.List<CareRecipient> findByNameContainingIgnoreCaseOrCareRecipientNumberContainingIgnoreCaseOrderByCreatedAtDesc(
            String name, String careRecipientNumber);
}
