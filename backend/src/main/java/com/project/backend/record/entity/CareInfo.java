package com.project.backend.record.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "care_info", uniqueConstraints = @UniqueConstraint(columnNames = {"careRecipientId", "category"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareInfo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long careRecipientId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private CareInfoCategory category;
    @Column(nullable = false, length = 3000)
    private String content;
    @Column(nullable = false)
    private Instant updatedAt;

    public CareInfo(Long careRecipientId, CareInfoCategory category) {
        this.careRecipientId = careRecipientId;
        this.category = category;
    }

    public void update(String content, Instant now) {
        this.content = content;
        this.updatedAt = now;
    }
}
