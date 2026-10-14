package com.project.backend.care.repository;

import com.project.backend.care.entity.AccessLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AccessLogRepository extends JpaRepository<AccessLog, Long> {

    @Query("SELECT a FROM AccessLog a WHERE a.careRecipientId = :careRecipientId AND a.occurredAt < :before ORDER BY a.occurredAt DESC")
    List<AccessLog> findByCareRecipientIdCursor(@Param("careRecipientId") Long careRecipientId,
                                                 @Param("before") LocalDateTime before,
                                                 Pageable pageable);

    @Query("SELECT a FROM AccessLog a WHERE a.careRecipientId = :careRecipientId ORDER BY a.occurredAt DESC")
    List<AccessLog> findByCareRecipientIdLatest(@Param("careRecipientId") Long careRecipientId,
                                                 Pageable pageable);
}
