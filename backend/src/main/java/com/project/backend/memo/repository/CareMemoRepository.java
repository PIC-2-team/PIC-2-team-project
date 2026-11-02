package com.project.backend.memo.repository;

import com.project.backend.memo.entity.CareMemo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CareMemoRepository extends JpaRepository<CareMemo, Long> {
    List<CareMemo> findByCareRecipientIdAndDateOrderByCreatedAtAsc(Long careRecipientId, LocalDate date);
    List<CareMemo> findByCareRecipientIdAndDateGreaterThanEqualAndDateLessThanOrderByDateAscCreatedAtAsc(
            Long careRecipientId, LocalDate from, LocalDate to);
    Optional<CareMemo> findByIdAndCareRecipientId(Long id, Long careRecipientId);
}
