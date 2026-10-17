package com.project.backend.user.repository;

import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByGoogleId(String googleId);
    Optional<User> findByPublicCode(String publicCode);
    boolean existsByEmail(String email);
    boolean existsByPublicCode(String publicCode);
    long countByRole(UserRole role);
    Page<User> findByRole(UserRole role, Pageable pageable);
}
