package com.project.backend.organization.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "organization")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = true)
    private Long ownerId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 12)
    private String organizationCode;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Organization(Long ownerId, String name, String organizationCode) {
        this.ownerId = ownerId;
        this.name = name;
        this.organizationCode = organizationCode;
        this.createdAt = LocalDateTime.now();
    }

    public void assignOwner(Long ownerId) {
        this.ownerId = ownerId;
    }

    public void updateName(String name) {
        this.name = name;
    }
}
