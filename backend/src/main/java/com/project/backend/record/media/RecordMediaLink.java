package com.project.backend.record.media;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "record_media_link", uniqueConstraints = @UniqueConstraint(columnNames = {"recordId", "mediaId"}),
        indexes = @Index(columnList = "mediaId"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecordMediaLink {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long recordId;
    @Column(nullable = false)
    private Long mediaId;

    public RecordMediaLink(Long recordId, Long mediaId) {
        this.recordId = recordId;
        this.mediaId = mediaId;
    }
}
