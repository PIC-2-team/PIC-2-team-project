package com.project.backend.push.repository;

import com.project.backend.push.entity.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    List<PushSubscription> findByUserId(Long userId);
    List<PushSubscription> findByUserIdIn(List<Long> userIds);
    Optional<PushSubscription> findByUserIdAndEndpoint(Long userId, String endpoint);
    void deleteByUserIdAndEndpoint(Long userId, String endpoint);
}
