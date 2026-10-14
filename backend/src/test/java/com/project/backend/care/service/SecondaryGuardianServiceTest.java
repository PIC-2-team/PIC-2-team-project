package com.project.backend.care.service;

import com.project.backend.care.dto.InviteSecondaryGuardianRequest;
import com.project.backend.care.dto.SecondaryGuardianResponse;
import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SecondaryGuardianServiceTest {

    @Mock CareGuardianRepository careGuardianRepository;
    @Mock UserRepository userRepository;

    @InjectMocks SecondaryGuardianService secondaryGuardianService;

    @Test
    void invite_PRIMARY_보호자가_유효한_초대_생성() {
        User primary = guardianUser(1L);
        User invitee = guardianUser(2L);
        given(careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                100L, 1L, GuardianStatus.ACTIVE)).willReturn(true);
        given(userRepository.findByPublicCode("P-INVITE1")).willReturn(Optional.of(invitee));
        given(careGuardianRepository.findByCareRecipientIdAndType(100L, GuardianType.SECONDARY))
                .willReturn(List.of());
        given(careGuardianRepository.save(any())).willAnswer(inv -> {
            CareGuardian g = inv.getArgument(0);
            ReflectionTestUtils.setField(g, "id", 10L);
            return g;
        });

        SecondaryGuardianResponse result = secondaryGuardianService.invite(
                1L, 100L, new InviteSecondaryGuardianRequest("P-INVITE1"));

        assertThat(result.status()).isEqualTo(GuardianStatus.PENDING);
        assertThat(result.guardianId()).isEqualTo(2L);
        assertThat(result.invitationToken()).isNotBlank();
        verify(careGuardianRepository).save(any(CareGuardian.class));
    }

    @Test
    void invite_PRIMARY_보호자가_아닌_경우_FORBIDDEN() {
        given(careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                100L, 99L, GuardianStatus.ACTIVE)).willReturn(false);

        assertThatThrownBy(() -> secondaryGuardianService.invite(
                99L, 100L, new InviteSecondaryGuardianRequest("P-INVITE1")))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void acceptInvitation_유효한_토큰으로_수락_성공() {
        CareGuardian pending = CareGuardian.builder()
                .careRecipientId(100L).guardianId(2L)
                .type(GuardianType.SECONDARY).status(GuardianStatus.PENDING)
                .invitationToken("token-abc").invitationExpiresAt(LocalDateTime.now().plusHours(1))
                .build();
        given(careGuardianRepository.findByInvitationToken("token-abc"))
                .willReturn(Optional.of(pending));

        secondaryGuardianService.acceptInvitation(2L, "token-abc");

        assertThat(pending.getStatus()).isEqualTo(GuardianStatus.ACTIVE);
        assertThat(pending.getInvitationToken()).isNull();
    }

    @Test
    void acceptInvitation_만료된_토큰은_GONE() {
        CareGuardian expired = CareGuardian.builder()
                .careRecipientId(100L).guardianId(2L)
                .type(GuardianType.SECONDARY).status(GuardianStatus.PENDING)
                .invitationToken("expired-token").invitationExpiresAt(LocalDateTime.now().minusHours(1))
                .build();
        given(careGuardianRepository.findByInvitationToken("expired-token"))
                .willReturn(Optional.of(expired));

        assertThatThrownBy(() -> secondaryGuardianService.acceptInvitation(2L, "expired-token"))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.GONE);
    }

    @Test
    void revoke_PRIMARY_보호자가_세컨드_보호자_해제() {
        given(careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                100L, 1L, GuardianStatus.ACTIVE)).willReturn(true);

        CareGuardian secondary = CareGuardian.builder()
                .careRecipientId(100L).guardianId(2L)
                .type(GuardianType.SECONDARY).status(GuardianStatus.ACTIVE)
                .invitationToken(null).invitationExpiresAt(null)
                .build();
        given(careGuardianRepository.findByCareRecipientIdAndTypeAndStatus(
                100L, GuardianType.SECONDARY, GuardianStatus.ACTIVE))
                .willReturn(Optional.of(secondary));

        secondaryGuardianService.revokeSecondaryGuardian(1L, 100L);

        assertThat(secondary.getStatus()).isEqualTo(GuardianStatus.REVOKED);
    }

    private User guardianUser(Long id) {
        User u = User.builder().name("보호자").email("g" + id + "@test.com")
                .publicCode("P-INVITE" + id).role(UserRole.GUARDIAN).build();
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }
}
