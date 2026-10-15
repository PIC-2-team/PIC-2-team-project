package com.project.backend.auth.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "consent")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Consent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private boolean basicInfo;

    @Column(nullable = false)
    private boolean sensitiveInfo;

    @Column(nullable = false)
    private boolean caregiverShare;

    @Column(nullable = false)
    private boolean marketing;

    @Column(nullable = false, length = 20)
    private String termsVersion;

    @Column(nullable = false, updatable = false)
    private LocalDateTime agreedAt;

    @Builder
    public Consent(Long userId, boolean basicInfo, boolean sensitiveInfo,
                   boolean caregiverShare, boolean marketing, String termsVersion) {
        this.userId = userId;
        this.basicInfo = basicInfo;
        this.sensitiveInfo = sensitiveInfo;
        this.caregiverShare = caregiverShare;
        this.marketing = marketing;
        this.termsVersion = termsVersion;
        this.agreedAt = LocalDateTime.now();
    }
}
