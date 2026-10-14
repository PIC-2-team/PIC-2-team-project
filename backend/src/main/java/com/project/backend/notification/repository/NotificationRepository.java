package com.project.backend.notification.repository;

import com.project.backend.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByUserId(Long userId, Pageable pageable);
    Page<Notification> findByUserIdAndRead(Long userId, boolean read, Pageable pageable);
    Optional<Notification> findByIdAndUserId(Long id, Long userId);
}
