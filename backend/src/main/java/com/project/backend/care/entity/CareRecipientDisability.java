package com.project.backend.care.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "care_recipient_disability",
       uniqueConstraints = @UniqueConstraint(columnNames = {"careRecipientId", "disabilityType"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareRecipientDisability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long careRecipientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DisabilityType disabilityType;

    @Builder
    public CareRecipientDisability(Long careRecipientId, DisabilityType disabilityType) {
        this.careRecipientId = careRecipientId;
        this.disabilityType = disabilityType;
    }
}
