package com.project.backend.care.service;

import com.project.backend.care.dto.InviteSecondaryGuardianRequest;
import com.project.backend.care.dto.SecondaryGuardianResponse;
import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class SecondaryGuardianService {

    private final CareGuardianRepository careGuardianRepository;
    private final UserRepository userRepository;

    public SecondaryGuardianResponse invite(Long primaryGuardianId, Long careRecipientId,
                                            InviteSecondaryGuardianRequest request) {
        verifyPrimaryGuardian(primaryGuardianId, careRecipientId);

        User invitee = userRepository.findByPublicCode(request.inviteePublicCode())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));
        if (invitee.getRole() != UserRole.GUARDIAN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "보호자 계정만 세컨드 보호자로 초대할 수 있습니다.");
        }

        // 기존 SECONDARY 관계(ACTIVE/PENDING) 존재 시 모두 revoke
        careGuardianRepository.findByCareRecipientIdAndType(careRecipientId, GuardianType.SECONDARY)
                .stream()
                .filter(g -> g.getStatus() == GuardianStatus.ACTIVE || g.getStatus() == GuardianStatus.PENDING)
                .forEach(CareGuardian::revoke);

        CareGuardian invitation = careGuardianRepository.save(CareGuardian.builder()
                .careRecipientId(careRecipientId)
                .guardianId(invitee.getId())
                .type(GuardianType.SECONDARY)
                .status(GuardianStatus.PENDING)
                .invitationToken(UUID.randomUUID().toString())
                .invitationExpiresAt(LocalDateTime.now().plusHours(24))
                .build());

        return SecondaryGuardianResponse.from(invitation);
    }

    @Transactional(readOnly = true)
    public Optional<SecondaryGuardianResponse> getSecondaryGuardian(Long userId, Long careRecipientId) {
        verifyPrimaryGuardian(userId, careRecipientId);
        return careGuardianRepository
                .findByCareRecipientIdAndTypeAndStatus(careRecipientId, GuardianType.SECONDARY, GuardianStatus.ACTIVE)
                .map(SecondaryGuardianResponse::from);
    }

    public void revokeSecondaryGuardian(Long primaryGuardianId, Long careRecipientId) {
        verifyPrimaryGuardian(primaryGuardianId, careRecipientId);
        CareGuardian secondary = careGuardianRepository
                .findByCareRecipientIdAndTypeAndStatus(careRecipientId, GuardianType.SECONDARY, GuardianStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SECONDARY_GUARDIAN_NOT_FOUND", "세컨드 보호자가 없습니다."));
        secondary.revoke();
    }

    public void acceptInvitation(Long userId, String invitationToken) {
        CareGuardian invitation = careGuardianRepository.findByInvitationToken(invitationToken)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "INVITATION_NOT_FOUND", "초대를 찾을 수 없습니다."));

        if (!invitation.getGuardianId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "이 초대의 대상자가 아닙니다.");
        }
        if (invitation.getStatus() != GuardianStatus.PENDING) {
            throw new ApiException(HttpStatus.CONFLICT, "INVITATION_ALREADY_PROCESSED", "이미 처리된 초대입니다.");
        }
        if (invitation.getInvitationExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.GONE, "INVITATION_EXPIRED", "초대가 만료되었습니다.");
        }

        invitation.activate();
    }

    private void verifyPrimaryGuardian(Long userId, Long careRecipientId) {
        if (!careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndTypeAndStatus(
                careRecipientId, userId, GuardianType.PRIMARY, GuardianStatus.ACTIVE)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "PRIMARY 보호자만 세컨드 보호자를 관리할 수 있습니다.");
        }
    }
}
