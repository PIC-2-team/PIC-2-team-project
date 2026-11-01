package com.project.backend.schedule.repository;

import com.project.backend.schedule.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    List<Schedule> findByCareRecipientIdAndScheduledAtBetweenOrderByScheduledAtAsc(
            Long careRecipientId, Instant from, Instant to);

    Optional<Schedule> findByIdAndCareRecipientId(Long id, Long careRecipientId);
}
