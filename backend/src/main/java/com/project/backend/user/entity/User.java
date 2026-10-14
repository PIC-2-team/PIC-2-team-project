package com.project.backend.user.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column
    private String password;

    @Column(length = 20)
    private String phone;

    @Column(nullable = false, unique = true, length = 12)
    private String publicCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(length = 100)
    private String googleId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public User(String name, String email, String password, String phone,
                String publicCode, UserRole role, String googleId) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.phone = phone;
        this.publicCode = publicCode;
        this.role = role;
        this.googleId = googleId;
        this.createdAt = LocalDateTime.now();
    }

    public void updateProfile(String name, String phone) {
        this.name = name;
        this.phone = phone;
    }

    public void updatePassword(String encodedPassword) {
        this.password = encodedPassword;
    }
}
