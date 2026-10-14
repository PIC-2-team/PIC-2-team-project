package com.project.backend.record.repository;

import com.project.backend.record.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CareInfoRepository extends JpaRepository<CareInfo, Long> {
    Optional<CareInfo> findByCareRecipientIdAndCategory(Long careRecipientId, CareInfoCategory category);
    List<CareInfo> findByCareRecipientId(Long careRecipientId);
}
