package com.project.backend.user.repository;

import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhone(String phone);
    Optional<User> findByGoogleId(String googleId);
    Optional<User> findByPublicCode(String publicCode);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.publicCode = :publicCode")
    Optional<User> findByPublicCodeForUpdate(@Param("publicCode") String publicCode);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);
    List<User> findByName(String name);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    boolean existsByPublicCode(String publicCode);
    long countByRole(UserRole role);
    Page<User> findByRole(UserRole role, Pageable pageable);
    Page<User> findByIdIn(java.util.List<Long> ids, Pageable pageable);
    Page<User> findByIdInAndRole(java.util.List<Long> ids, UserRole role, Pageable pageable);
}
