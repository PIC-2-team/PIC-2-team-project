package com.project.backend.record.media;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RecordMediaRepository extends JpaRepository<RecordMedia, Long> {
    List<RecordMedia> findAllByIdInAndCareRecipientId(List<Long> ids, Long careRecipientId);
    List<RecordMedia> findAllByCareRecipientIdOrderByCreatedAtDesc(Long careRecipientId);
}
