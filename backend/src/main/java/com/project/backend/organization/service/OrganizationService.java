package com.project.backend.organization.service;

import com.project.backend.care.entity.CareGuardian;
import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.entity.GuardianType;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.organization.dto.CreateOrganizationRequest;
import com.project.backend.organization.dto.OrganizationResponse;
import com.project.backend.organization.entity.*;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
@Transactional
public class OrganizationService {

    private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final OrganizationRecipientLinkRepository organizationRecipientLinkRepository;
    private final CareGuardianRepository careGuardianRepository;
    private final CareRecipientRepository careRecipientRepository;
    private final UserRepository userRepository;

    public OrganizationResponse create(Long ownerId, CreateOrganizationRequest request) {
        User owner = findUser(ownerId);
        if (owner.getRole() != UserRole.INSTITUTION) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "기관 계정만 기관을 생성할 수 있습니다.");
        }
        if (organizationRepository.findByOwnerId(ownerId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "ORGANIZATION_ALREADY_EXISTS", "이미 기관을 보유하고 있습니다.");
        }

        Organization org = organizationRepository.save(Organization.builder()
                .ownerId(ownerId)
                .name(request.name())
                .organizationCode(generateUniqueCode())
                .build());

        return OrganizationResponse.from(org);
    }

    @Transactional(readOnly = true)
    public OrganizationResponse getMyOrganization(Long ownerId) {
        return organizationRepository.findByOwnerId(ownerId)
                .map(OrganizationResponse::from)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND", "기관을 찾을 수 없습니다."));
    }

    public void requestRecipientLink(Long guardianId, Long careRecipientId, String organizationCode) {
        verifyGuardianAccess(guardianId, careRecipientId);
        Organization org = organizationRepository.findByOrganizationCode(organizationCode)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND", "기관 코드를 찾을 수 없습니다."));

        if (organizationRecipientLinkRepository
                .findByOrganizationIdAndCareRecipientId(org.getId(), careRecipientId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "LINK_ALREADY_EXISTS", "이미 연결 요청이 존재합니다.");
        }

        organizationRecipientLinkRepository.save(OrganizationRecipientLink.builder()
                .organizationId(org.getId())
                .careRecipientId(careRecipientId)
                .requestedById(guardianId)
                .build());
    }

    public void decideLinkRequest(Long organizationOwnerId, Long linkId, boolean accepted) {
        Organization org = organizationRepository.findByOwnerId(organizationOwnerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND", "기관을 찾을 수 없습니다."));

        OrganizationRecipientLink link = organizationRecipientLinkRepository.findById(linkId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "LINK_NOT_FOUND", "연결 요청을 찾을 수 없습니다."));

        if (!link.getOrganizationId().equals(org.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다.");
        }
        if (link.getStatus() != LinkStatus.PENDING) {
            throw new ApiException(HttpStatus.CONFLICT, "LINK_ALREADY_DECIDED", "이미 처리된 요청입니다.");
        }

        if (accepted) link.accept();
        else link.reject();
    }

    public OrganizationMember addMember(Long ownerId, Long supportWorkerId) {
        Organization org = organizationRepository.findByOwnerId(ownerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND", "기관을 찾을 수 없습니다."));
        User worker = findUser(supportWorkerId);
        if (worker.getRole() != UserRole.SUPPORT_WORKER) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "활동지원사 계정만 멤버로 추가할 수 있습니다.");
        }
        return organizationMemberRepository.save(
                OrganizationMember.builder().organizationId(org.getId()).userId(supportWorkerId).build());
    }

    private void verifyGuardianAccess(Long guardianId, Long careRecipientId) {
        if (!careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                careRecipientId, guardianId, GuardianStatus.ACTIVE)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "당사자의 보호자만 기관 연결을 요청할 수 있습니다.");
        }
    }

    private String generateUniqueCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(8);
            for (int i = 0; i < 8; i++) sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
            code = sb.toString();
        } while (organizationRepository.existsByOrganizationCode(code));
        return code;
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));
    }
}
