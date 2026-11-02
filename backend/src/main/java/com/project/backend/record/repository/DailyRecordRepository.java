package com.project.backend.record.repository;

import com.project.backend.record.entity.DailyRecord;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface DailyRecordRepository extends JpaRepository<DailyRecord, Long>, JpaSpecificationExecutor<DailyRecord> {
    Optional<DailyRecord> findByIdAndCareRecipientId(Long id, Long careRecipientId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from DailyRecord r where r.id = :id and r.careRecipientId = :careRecipientId")
    Optional<DailyRecord> findForUpdate(Long id, Long careRecipientId);

    List<DailyRecord> findByCareRecipientIdAndPinnedTrueAndDeletedAtIsNullOrderByRecordedAtDescIdDesc(Long careRecipientId);

    List<DailyRecord> findByAuthorIdAndDeletedAtIsNullOrderByRecordedAtDesc(Long authorId);

    List<DailyRecord> findByCareRecipientIdInAndDeletedAtIsNullOrderByRecordedAtDesc(List<Long> careRecipientIds);

    @Query("""
            select distinct r.authorId from DailyRecord r
            where r.deletedAt is null
              and r.recordedAt >= :startOfDay and r.recordedAt < :endOfDay
            """)
    List<Long> findAuthorIdsByRecordedAtBetween(
            @Param("startOfDay") Instant startOfDay,
            @Param("endOfDay") Instant endOfDay);
}
