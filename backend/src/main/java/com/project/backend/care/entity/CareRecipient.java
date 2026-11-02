package com.project.backend.care.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "care_recipient")
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 12)
    private String careRecipientNumber;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false)
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DisabilitySeverity disabilitySeverity;

    @Column(length = 100)
    private String otherDisabilityType;

    @Column(length = 100)
    private String hospitalName;

    @Column(length = 50)
    private String doctorName;

    @Column(length = 30)
    private String hospitalPhone;

    @Column(length = 100)
    private String supportCenterName;

    @Column(length = 50)
    private String supportCenterManagerName;

    @Column(length = 30)
    private String supportCenterPhone;

    @Column
    private LocalDateTime latestRecordAt;

    @Column
    private LocalDateTime deletedAt;

    @Column
    private LocalDateTime transferredAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public CareRecipient(String careRecipientNumber, String name, LocalDate birthDate,
                         Gender gender, DisabilitySeverity disabilitySeverity, String otherDisabilityType,
                         String hospitalName, String doctorName, String hospitalPhone,
                         String supportCenterName, String supportCenterManagerName,
                         String supportCenterPhone) {
        this.careRecipientNumber = careRecipientNumber;
        this.name = name;
        this.birthDate = birthDate;
        this.gender = gender;
        this.disabilitySeverity = disabilitySeverity;
        this.otherDisabilityType = otherDisabilityType;
        this.hospitalName = blankToNull(hospitalName);
        this.doctorName = blankToNull(doctorName);
        this.hospitalPhone = blankToNull(hospitalPhone);
        this.supportCenterName = blankToNull(supportCenterName);
        this.supportCenterManagerName = blankToNull(supportCenterManagerName);
        this.supportCenterPhone = blankToNull(supportCenterPhone);
        this.createdAt = LocalDateTime.now();
    }

    public void update(String name, LocalDate birthDate, Gender gender,
                       DisabilitySeverity disabilitySeverity, String otherDisabilityType) {
        if (name != null) this.name = name;
        if (birthDate != null) this.birthDate = birthDate;
        if (gender != null) this.gender = gender;
        this.disabilitySeverity = disabilitySeverity;
        this.otherDisabilityType = otherDisabilityType;
    }

    // null은 변경 없음, 빈 문자열은 삭제. 일부 필드만 보내는 PATCH가 기존 정보를 지우지 않게 하기 위함
    public void updateCareContacts(String hospitalName, String doctorName, String hospitalPhone,
                                   String supportCenterName, String supportCenterManagerName,
                                   String supportCenterPhone) {
        if (hospitalName != null) this.hospitalName = blankToNull(hospitalName);
        if (doctorName != null) this.doctorName = blankToNull(doctorName);
        if (hospitalPhone != null) this.hospitalPhone = blankToNull(hospitalPhone);
        if (supportCenterName != null) this.supportCenterName = blankToNull(supportCenterName);
        if (supportCenterManagerName != null) this.supportCenterManagerName = blankToNull(supportCenterManagerName);
        if (supportCenterPhone != null) this.supportCenterPhone = blankToNull(supportCenterPhone);
    }

    // 동의 주체인 보호자가 사라지므로 의료·연락처 정보는 기관 이관 전에 비운다 (ADR-014)
    public void transfer(LocalDateTime now) {
        this.hospitalName = null;
        this.doctorName = null;
        this.hospitalPhone = null;
        this.supportCenterName = null;
        this.supportCenterManagerName = null;
        this.supportCenterPhone = null;
        this.transferredAt = now;
    }

    // 새 주 보호자가 기관의 승인으로 연결되면 이관 상태가 끝난다
    public void clearTransferred() {
        this.transferredAt = null;
    }

    public boolean isTransferred() {
        return transferredAt != null;
    }

    public void softDelete(LocalDateTime now) {
        this.deletedAt = now;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    public void updateLatestRecordAt(LocalDateTime recordedAt) {
        if (this.latestRecordAt == null || recordedAt.isAfter(this.latestRecordAt)) {
            this.latestRecordAt = recordedAt;
        }
    }
}
