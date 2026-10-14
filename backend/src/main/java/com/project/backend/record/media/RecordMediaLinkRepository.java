package com.project.backend.record.media;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RecordMediaLinkRepository extends JpaRepository<RecordMediaLink, Long> {
    List<RecordMediaLink> findAllByRecordIdOrderById(Long recordId);
    List<RecordMediaLink> findAllByRecordIdInOrderById(List<Long> recordIds);
    List<RecordMediaLink> findAllByMediaId(Long mediaId);
    void deleteAllByRecordId(Long recordId);
    void deleteAllByMediaId(Long mediaId);
}
