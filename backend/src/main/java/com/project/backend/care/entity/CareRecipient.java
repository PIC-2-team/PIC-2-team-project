package com.project.backend.care.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "care_recipient")
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

    @Column
    private Integer disabilityGrade;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DisabilitySeverity disabilitySeverity;

    @Column(length = 100)
    private String otherDisabilityType;

    @Column(length = 20)
    private String guardianContactPhone;

    @Column(length = 20)
    private String emergencyContactPhone;

    @Column(length = 100)
    private String doctorHospital;

    @Column(length = 1000)
    private String medicationInfo;

    @Column(length = 1000)
    private String allergyNotes;

    @Column
    private LocalDateTime latestRecordAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public CareRecipient(String careRecipientNumber, String name, LocalDate birthDate,
                         Gender gender, Integer disabilityGrade, DisabilitySeverity disabilitySeverity,
                         String otherDisabilityType, String guardianContactPhone, String emergencyContactPhone,
                         String doctorHospital, String medicationInfo, String allergyNotes) {
        this.careRecipientNumber = careRecipientNumber;
        this.name = name;
        this.birthDate = birthDate;
        this.gender = gender;
        this.disabilityGrade = disabilityGrade;
        this.disabilitySeverity = disabilitySeverity != null
                ? disabilitySeverity : DisabilitySeverity.fromLegacyGrade(disabilityGrade);
        this.otherDisabilityType = otherDisabilityType;
        if (guardianContactPhone != null) this.guardianContactPhone = guardianContactPhone;
        if (emergencyContactPhone != null) this.emergencyContactPhone = emergencyContactPhone;
        if (doctorHospital != null) this.doctorHospital = doctorHospital;
        if (medicationInfo != null) this.medicationInfo = medicationInfo;
        if (allergyNotes != null) this.allergyNotes = allergyNotes;
        this.createdAt = LocalDateTime.now();
    }

    public void update(String name, LocalDate birthDate, Gender gender,
                       Integer disabilityGrade, DisabilitySeverity disabilitySeverity, String otherDisabilityType,
                       String guardianContactPhone, String emergencyContactPhone, String doctorHospital,
                       String medicationInfo, String allergyNotes) {
        if (name != null) this.name = name;
        if (birthDate != null) this.birthDate = birthDate;
        if (gender != null) this.gender = gender;
        this.disabilityGrade = disabilityGrade;
        this.disabilitySeverity = disabilitySeverity != null
                ? disabilitySeverity : DisabilitySeverity.fromLegacyGrade(disabilityGrade);
        this.otherDisabilityType = otherDisabilityType;
        if (guardianContactPhone != null) this.guardianContactPhone = guardianContactPhone;
        if (emergencyContactPhone != null) this.emergencyContactPhone = emergencyContactPhone;
        if (doctorHospital != null) this.doctorHospital = doctorHospital;
        if (medicationInfo != null) this.medicationInfo = medicationInfo;
        if (allergyNotes != null) this.allergyNotes = allergyNotes;
    }

    public void updateLatestRecordAt(LocalDateTime recordedAt) {
        if (this.latestRecordAt == null || recordedAt.isAfter(this.latestRecordAt)) {
            this.latestRecordAt = recordedAt;
        }
    }
}
