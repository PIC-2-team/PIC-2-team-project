package com.project.backend.push.service;

import com.project.backend.push.entity.PushSubscription;
import com.project.backend.push.repository.PushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PushSubscriptionService {

    private final PushSubscriptionRepository pushSubscriptions;

    public void subscribe(Long userId, String endpoint, String p256dh, String auth) {
        pushSubscriptions.findByUserIdAndEndpoint(userId, endpoint)
                .orElseGet(() -> pushSubscriptions.save(new PushSubscription(userId, endpoint, p256dh, auth)));
    }

    public void unsubscribe(Long userId, String endpoint) {
        pushSubscriptions.deleteByUserIdAndEndpoint(userId, endpoint);
    }

    @Transactional(readOnly = true)
    public List<PushSubscription> findAllByUserIds(List<Long> userIds) {
        return pushSubscriptions.findByUserIdIn(userIds);
    }
}
