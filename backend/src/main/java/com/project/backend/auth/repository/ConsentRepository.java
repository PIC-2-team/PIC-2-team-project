package com.project.backend.auth.repository;

import com.project.backend.auth.entity.Consent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConsentRepository extends JpaRepository<Consent, Long> {
    Optional<Consent> findByUserId(Long userId);
    void deleteByUserId(Long userId);
}
