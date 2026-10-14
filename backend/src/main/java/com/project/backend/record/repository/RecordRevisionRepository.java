package com.project.backend.record.repository;

import com.project.backend.record.entity.RecordRevision;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;

public interface RecordRevisionRepository extends JpaRepository<RecordRevision, Long> {
    Page<RecordRevision> findByRecordId(Long recordId, Pageable pageable);
    @Query("select coalesce(max(r.revision), 0) from RecordRevision r where r.recordId = :recordId")
    int latestRevision(Long recordId);
}
