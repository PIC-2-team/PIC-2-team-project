package com.project.backend.care.repository;

import com.project.backend.care.entity.CareRecipientRoutine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CareRecipientRoutineRepository extends JpaRepository<CareRecipientRoutine, Long> {
    List<CareRecipientRoutine> findByCareRecipientIdOrderByRoutineTimeAscIdAsc(Long careRecipientId);

    Optional<CareRecipientRoutine> findByIdAndCareRecipientId(Long id, Long careRecipientId);
}
