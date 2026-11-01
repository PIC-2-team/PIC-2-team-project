package com.project.backend.record.service;

import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class RecordAccessServiceTest {
    @Mock CareGuardianRepository guardians;
    @Mock CareAssignmentRepository assignments;
    @Mock OrganizationRepository organizations;
    @Mock OrganizationRecipientLinkRepository links;
    @Mock UserRepository users;
    @Mock Clock clock;
    @InjectMocks RecordAccessService access;

    @Test
    void 보호자는_본인_기록만_수정할_수_있다() {
        given(users.findById(1L)).willReturn(Optional.of(user(1L, UserRole.GUARDIAN)));
        given(guardians.existsByCareRecipientIdAndGuardianIdAndStatus(100L, 1L, GuardianStatus.ACTIVE))
                .willReturn(true);
        assertDoesNotThrow(() -> access.verifyEdit(1L, 100L, 1L));
        assertThrows(ApiException.class, () -> access.verifyEdit(1L, 100L, 2L));
    }

    @Test
    void 현재_배정된_활동지원사는_본인_기록만_수정할_수_있다() {
        given(users.findById(2L)).willReturn(Optional.of(user(2L, UserRole.SUPPORT_WORKER)));
        given(clock.instant()).willReturn(Instant.parse("2026-10-29T00:00:00Z"));
        given(assignments.hasCurrentAssignment(2L, 100L,
                LocalDate.ofInstant(Instant.parse("2026-10-29T00:00:00Z"), ZoneId.of("Asia/Seoul"))))
                .willReturn(true);
        assertDoesNotThrow(() -> access.verifyEdit(2L, 100L, 2L));
        assertThrows(ApiException.class, () -> access.verifyEdit(2L, 100L, 1L));
    }

    private User user(Long id, UserRole role) {
        User user = User.builder().name("사용자").email("user@test.com")
                .publicCode("P-TEST").role(role).build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
