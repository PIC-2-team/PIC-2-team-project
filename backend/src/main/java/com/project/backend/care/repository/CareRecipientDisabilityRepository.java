package com.project.backend.care.repository;

import com.project.backend.care.entity.CareRecipientDisability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CareRecipientDisabilityRepository extends JpaRepository<CareRecipientDisability, Long> {
    List<CareRecipientDisability> findByCareRecipientId(Long careRecipientId);
    void deleteByCareRecipientId(Long careRecipientId);
}
