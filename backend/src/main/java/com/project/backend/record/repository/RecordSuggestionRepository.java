package com.project.backend.record.repository;

import com.project.backend.record.entity.RecordSuggestion;
import com.project.backend.record.entity.RecordSuggestionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;

public interface RecordSuggestionRepository extends JpaRepository<RecordSuggestion, Long> {
    Page<RecordSuggestion> findByCareRecipientIdAndStatus(Long careRecipientId, RecordSuggestionStatus status,
                                                            Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from RecordSuggestion s where s.id = :id and s.careRecipientId = :careRecipientId")
    Optional<RecordSuggestion> findForUpdate(Long id, Long careRecipientId);
}
