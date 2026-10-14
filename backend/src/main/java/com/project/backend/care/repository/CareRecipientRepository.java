package com.project.backend.care.repository;

import com.project.backend.care.entity.CareRecipient;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareRecipientRepository extends JpaRepository<CareRecipient, Long> {
    boolean existsByCareRecipientNumber(String careRecipientNumber);
}
