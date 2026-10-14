package com.project.backend.notification.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "notification", indexes = @Index(columnList = "userId,createdAt"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long userId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40)
    private NotificationType type;
    @Column(nullable = false, length = 500)
    private String message;
    @Column(name = "is_read", nullable = false)
    private boolean read;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public Notification(Long userId, NotificationType type, String message, Instant now) {
        this.userId = userId;
        this.type = type;
        this.message = message;
        this.read = false;
        this.createdAt = now;
    }

    public void markRead(boolean read) {
        this.read = read;
    }
}
