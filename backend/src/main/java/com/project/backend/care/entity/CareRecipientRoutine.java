package com.project.backend.care.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Entity
@Table(name = "care_recipient_routine", indexes = @Index(columnList = "careRecipientId,routineTime"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareRecipientRoutine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long careRecipientId;

    @Column(nullable = false)
    private LocalTime routineTime;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 500)
    private String memo;

    @Builder
    public CareRecipientRoutine(Long careRecipientId, LocalTime routineTime, String title, String memo) {
        this.careRecipientId = careRecipientId;
        this.routineTime = routineTime;
        this.title = title.trim();
        this.memo = blankToNull(memo);
    }

    public void update(LocalTime routineTime, String title, String memo) {
        this.routineTime = routineTime;
        this.title = title.trim();
        this.memo = blankToNull(memo);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
