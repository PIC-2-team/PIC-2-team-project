package com.project.backend.record.media;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "record_media", indexes = @Index(columnList = "careRecipientId"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecordMedia {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long careRecipientId;
    @Column(nullable = false)
    private Long uploaderId;
    @Column(nullable = false, length = 255)
    private String fileName;
    @Column(nullable = false, length = 100)
    private String mediaType;
    @Column(nullable = false)
    private long sizeBytes;
    @Column(nullable = false, unique = true, length = 512)
    private String s3Key;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public RecordMedia(Long careRecipientId, Long uploaderId, String fileName, String mediaType,
                       long sizeBytes, String s3Key, Instant createdAt) {
        this.careRecipientId = careRecipientId;
        this.uploaderId = uploaderId;
        this.fileName = fileName;
        this.mediaType = mediaType;
        this.sizeBytes = sizeBytes;
        this.s3Key = s3Key;
        this.createdAt = createdAt;
    }
}
