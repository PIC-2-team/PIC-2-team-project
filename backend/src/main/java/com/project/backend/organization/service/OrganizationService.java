package com.project.backend.organization.service;

import com.project.backend.care.entity.CareAssignment;
import com.project.backend.care.entity.CareGuardian;
import com.project.backend.care.entity.CareRecipient;
import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.entity.GuardianType;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.organization.dto.*;
import com.project.backend.organization.entity.*;
import com.project.backend.organization.repository.OrganizationGuardianLinkRepository;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class OrganizationService {

    private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final OrganizationRecipientLinkRepository organizationRecipientLinkRepository;
    private final OrganizationGuardianLinkRepository organizationGuardianLinkRepository;
    private final CareAssignmentRepository careAssignmentRepository;
    private final CareGuardianRepository careGuardianRepository;
    private final CareRecipientRepository careRecipientRepository;
    private final UserRepository userRepository;

    public OrganizationResponse register(Long ownerId, RegisterOrganizationRequest request) {
        User owner = findUser(ownerId);
        if (owner.getRole() != UserRole.INSTITUTION) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "기관 계정만 기관을 등록할 수 있습니다.");
        }
        if (organizationRepository.findByOwnerId(ownerId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "ORGANIZATION_ALREADY_EXISTS", "이미 기관을 보유하고 있습니다.");
        }

        Organization org = organizationRepository.findByOrganizationCode(request.organizationCode().trim().toUpperCase())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND", "기관 코드를 찾을 수 없습니다."));

        if (org.getOwnerId() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "ORGANIZATION_ALREADY_REGISTERED", "이미 등록된 기관 코드입니다.");
        }

        org.assignOwner(ownerId);
        return OrganizationResponse.from(org);
    }

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
        return OrganizationResponse.from(findOrgByOwner(ownerId));
    }

    public void requestRecipientLink(Long guardianId, Long careRecipientId, String organizationCode) {
        verifyGuardianAccess(guardianId, careRecipientId);
        Organization org = organizationRepository.findByOrganizationCode(organizationCode)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND", "기관 코드를 찾을 수 없습니다."));
        lockRecipient(careRecipientId);

        if (organizationRecipientLinkRepository
                .findByOrganizationIdAndCareRecipientIdForUpdate(org.getId(), careRecipientId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "LINK_ALREADY_EXISTS", "이미 연결 요청이 존재합니다.");
        }

        try {
            organizationRecipientLinkRepository.saveAndFlush(OrganizationRecipientLink.builder()
                    .organizationId(org.getId())
                    .careRecipientId(careRecipientId)
                    .requestedById(guardianId)
                    .build());
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(HttpStatus.CONFLICT, "LINK_ALREADY_EXISTS", "이미 연결 요청이 존재합니다.");
        }
    }

    public void decideLinkRequest(Long organizationOwnerId, Long linkId, boolean accepted) {
        Organization org = findOrgByOwner(organizationOwnerId);

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

    @Transactional(readOnly = true)
    public List<MemberResponse> getMembers(Long ownerId) {
        Organization org = findOrgByOwner(ownerId);
        List<OrganizationMember> members = organizationMemberRepository.findByOrganizationId(org.getId());
        List<Long> userIds = members.stream().map(OrganizationMember::getUserId).toList();
        Map<Long, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return members.stream()
                .map(m -> MemberResponse.of(m, userMap.get(m.getUserId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public MemberResponse getMember(Long ownerId, Long memberId) {
        Organization org = findOrgByOwner(ownerId);
        OrganizationMember member = findMemberInOrg(org.getId(), memberId);
        return MemberResponse.of(member, findUser(member.getUserId()));
    }

    public MemberResponse updateMemberStatus(Long ownerId, Long memberId, boolean active) {
        Organization org = findOrgByOwner(ownerId);
        OrganizationMember member = findMemberInOrg(org.getId(), memberId);
        lockWorker(member.getUserId());
        if (active) {
            verifyNoOtherActiveOrganization(org.getId(), member.getUserId());
            member.activate();
        } else {
            member.deactivate();
            endMemberAssignments(org.getId(), member.getUserId());
        }
        return MemberResponse.of(member, findUser(member.getUserId()));
    }

    public MemberResponse updateMember(Long ownerId, Long memberId, UpdateMemberRequest request) {
        Organization org = findOrgByOwner(ownerId);
        OrganizationMember member = findMemberInOrg(org.getId(), memberId);
        if (request.name() != null || request.phone() != null || request.active() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "지원사 소속 상태만 변경할 수 있습니다.");
        }
        lockWorker(member.getUserId());
        if (request.active()) {
            verifyNoOtherActiveOrganization(org.getId(), member.getUserId());
            member.activate();
        } else {
            member.deactivate();
            endMemberAssignments(org.getId(), member.getUserId());
        }
        return MemberResponse.of(member, findUser(member.getUserId()));
    }

    @Transactional(readOnly = true)
    public List<CareAssignmentResponse> getAssignments(Long ownerId, Long careRecipientId) {
        Organization org = findOrgByOwner(ownerId);
        List<CareAssignment> assignments = (careRecipientId != null)
                ? careAssignmentRepository.findByOrganizationIdAndCareRecipientId(org.getId(), careRecipientId)
                : careAssignmentRepository.findByOrganizationId(org.getId());
        return assignments.stream().map(CareAssignmentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<LinkRequestResponse> getLinkRequests(Long ownerId) {
        Organization org = findOrgByOwner(ownerId);
        return organizationRecipientLinkRepository.findByOrganizationId(org.getId()).stream()
                .map(LinkRequestResponse::from).toList();
    }

    public MemberResponse addMember(Long ownerId, AddMemberRequest request) {
        Organization org = findOrgByOwner(ownerId);
        String code = normalizePublicCode(request.publicCode(), "S-");
        User worker = userRepository.findByPublicCodeForUpdate(code)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SUPPORT_WORKER_NOT_FOUND", "해당 고유 코드의 활동지원사를 찾을 수 없습니다."));
        if (worker.getRole() != UserRole.SUPPORT_WORKER) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "활동지원사 계정만 멤버로 추가할 수 있습니다.");
        }
        List<OrganizationMember> activeMemberships = organizationMemberRepository.findByUserIdAndStatusForUpdate(worker.getId(), OrganizationMemberStatus.ACTIVE);
        if (activeMemberships.stream().anyMatch(member -> !member.getOrganizationId().equals(org.getId()))) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_ASSIGNED_TO_ORGANIZATION", "이미 다른 기관에 소속된 활동지원사입니다.");
        }
        if (activeMemberships.stream().anyMatch(member -> member.getOrganizationId().equals(org.getId()))) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_REGISTERED", "이미 등록된 활동지원사입니다.");
        }
        OrganizationMember member = organizationMemberRepository.findByOrganizationIdAndUserId(org.getId(), worker.getId())
                .map(m -> {
                    m.activate();
                    return organizationMemberRepository.save(m);
                })
                .orElseGet(() -> organizationMemberRepository.save(
                        OrganizationMember.builder().organizationId(org.getId()).userId(worker.getId()).build()));
        return MemberResponse.of(member, worker);
    }

    public void removeMember(Long ownerId, Long memberId) {
        Organization org = findOrgByOwner(ownerId);
        OrganizationMember member = findMemberInOrg(org.getId(), memberId);
        lockWorker(member.getUserId());
        endMemberAssignments(org.getId(), member.getUserId());
        organizationMemberRepository.delete(member);
    }

    public OrganizationGuardianResponse registerGuardian(Long ownerId, RegisterGuardianRequest request) {
        Organization org = findOrgByOwner(ownerId);
        String code = normalizePublicCode(request.publicCode(), "P-");
        User finalGuardian = userRepository.findByPublicCodeForUpdate(code)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "GUARDIAN_NOT_FOUND", "해당 고유 코드의 보호자를 찾을 수 없습니다."));

        if (finalGuardian.getRole() != UserRole.GUARDIAN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "돌봄 보호자 계정만 등록할 수 있습니다.");
        }

        if (!organizationGuardianLinkRepository.findByOrganizationIdAndGuardianIdForUpdate(
                org.getId(), finalGuardian.getId()).isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_REGISTERED", "이미 등록된 돌봄 보호자입니다.");
        }

        OrganizationGuardianLink link;
        try {
            link = organizationGuardianLinkRepository.saveAndFlush(
                    OrganizationGuardianLink.builder()
                            .organizationId(org.getId())
                            .guardianId(finalGuardian.getId())
                            .build()
            );
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_REGISTERED", "이미 등록된 돌봄 보호자입니다.");
        }

        // 보호자가 이미 등록해 둔 돌봄 대상자가 있다면 기관과 자동 연결(ACCEPTED)
        List<CareGuardian> careGuardians = careGuardianRepository.findByGuardianIdAndStatus(finalGuardian.getId(), GuardianStatus.ACTIVE)
                .stream().sorted(Comparator.comparing(CareGuardian::getCareRecipientId)).toList();
        for (CareGuardian cg : careGuardians) {
            lockRecipient(cg.getCareRecipientId());
            if (organizationRecipientLinkRepository.findByOrganizationIdAndCareRecipientIdForUpdate(
                    org.getId(), cg.getCareRecipientId()).isEmpty()) {
                OrganizationRecipientLink recipientLink = OrganizationRecipientLink.builder()
                        .organizationId(org.getId())
                        .careRecipientId(cg.getCareRecipientId())
                        .requestedById(finalGuardian.getId())
                        .build();
                recipientLink.accept();
                organizationRecipientLinkRepository.saveAndFlush(recipientLink);
            }
        }

        List<Long> recipientIds = careGuardians.stream().map(CareGuardian::getCareRecipientId).toList();
        List<CareRecipient> recipients = careRecipientRepository.findAllById(recipientIds);
        List<OrganizationGuardianResponse.CareRecipientSummary> recipientSummaries = recipients.stream()
                .map(r -> new OrganizationGuardianResponse.CareRecipientSummary(
                        r.getId(),
                        r.getName(),
                        r.getCareRecipientNumber(),
                        r.getBirthDate() != null ? r.getBirthDate().toString() : null
                ))
                .toList();

        return new OrganizationGuardianResponse(
                link.getId(),
                finalGuardian.getId(),
                finalGuardian.getName(),
                finalGuardian.getPhone(),
                finalGuardian.getEmail(),
                finalGuardian.getPublicCode(),
                link.getCreatedAt(),
                recipientSummaries
        );
    }

    @Transactional(readOnly = true)
    public List<OrganizationGuardianResponse> getGuardians(Long ownerId) {
        Organization org = findOrgByOwner(ownerId);
        List<OrganizationGuardianLink> links = organizationGuardianLinkRepository.findByOrganizationId(org.getId());
        List<Long> guardianIds = links.stream().map(OrganizationGuardianLink::getGuardianId).toList();
        Map<Long, User> userMap = userRepository.findAllById(guardianIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        List<CareGuardian> allCareGuardians = careGuardianRepository.findByGuardianIdInAndStatus(guardianIds, GuardianStatus.ACTIVE);
        Map<Long, List<Long>> guardianToRecipientIds = allCareGuardians.stream()
                .collect(Collectors.groupingBy(
                        CareGuardian::getGuardianId,
                        Collectors.mapping(CareGuardian::getCareRecipientId, Collectors.toList())
                ));

        List<Long> allRecipientIds = allCareGuardians.stream().map(CareGuardian::getCareRecipientId).distinct().toList();
        Map<Long, CareRecipient> recipientMap = careRecipientRepository.findAllById(allRecipientIds).stream()
                .collect(Collectors.toMap(CareRecipient::getId, Function.identity()));

        return links.stream().map(link -> {
            User u = userMap.get(link.getGuardianId());
            List<Long> recIds = guardianToRecipientIds.getOrDefault(link.getGuardianId(), List.of());
            List<OrganizationGuardianResponse.CareRecipientSummary> summaries = recIds.stream()
                    .map(recipientMap::get)
                    .filter(java.util.Objects::nonNull)
                    .map(r -> new OrganizationGuardianResponse.CareRecipientSummary(
                            r.getId(),
                            r.getName(),
                            r.getCareRecipientNumber(),
                            r.getBirthDate() != null ? r.getBirthDate().toString() : null
                    ))
                    .toList();

            return new OrganizationGuardianResponse(
                    link.getId(),
                    link.getGuardianId(),
                    u != null ? u.getName() : "알 수 없음",
                    u != null ? u.getPhone() : null,
                    u != null ? u.getEmail() : null,
                    u != null ? u.getPublicCode() : null,
                    link.getCreatedAt(),
                    summaries
            );
        }).toList();
    }

    public void removeGuardian(Long ownerId, Long guardianId) {
        Organization org = findOrgByOwner(ownerId);
        OrganizationGuardianLink link = organizationGuardianLinkRepository
                .findByOrganizationIdAndGuardianId(org.getId(), guardianId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "LINK_NOT_FOUND", "등록된 돌봄 보호자를 찾을 수 없습니다."));

        Set<Long> recipientIds = careGuardianRepository.findByGuardianId(guardianId).stream()
                .map(CareGuardian::getCareRecipientId).collect(Collectors.toSet());
        List<Long> remainingGuardianIds = organizationGuardianLinkRepository.findByOrganizationId(org.getId()).stream()
                .map(OrganizationGuardianLink::getGuardianId)
                .filter(id -> !id.equals(guardianId)).toList();
        Set<Long> retainedRecipientIds = careGuardianRepository
                .findByGuardianIdInAndStatus(remainingGuardianIds, GuardianStatus.ACTIVE).stream()
                .map(CareGuardian::getCareRecipientId).collect(Collectors.toSet());
        recipientIds.removeAll(retainedRecipientIds);

        for (Long recipientId : recipientIds) {
            organizationRecipientLinkRepository.findByOrganizationIdAndCareRecipientId(org.getId(), recipientId)
                    .ifPresent(organizationRecipientLinkRepository::delete);
        }
        for (CareAssignment assignment : careAssignmentRepository.findByOrganizationId(org.getId())) {
            if (assignment.isActive() && recipientIds.contains(assignment.getCareRecipientId())) {
                assignment.end();
            }
        }
        organizationGuardianLinkRepository.delete(link);
    }

    private Organization findOrgByOwner(Long ownerId) {
        return organizationRepository.findByOwnerId(ownerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND", "기관을 찾을 수 없습니다."));
    }

    private OrganizationMember findMemberInOrg(Long organizationId, Long memberId) {
        OrganizationMember member = organizationMemberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND", "멤버를 찾을 수 없습니다."));
        if (!member.getOrganizationId().equals(organizationId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다.");
        }
        return member;
    }

    private void verifyNoOtherActiveOrganization(Long organizationId, Long userId) {
        if (organizationMemberRepository.findByUserIdAndStatusForUpdate(userId, OrganizationMemberStatus.ACTIVE).stream()
                .anyMatch(member -> !member.getOrganizationId().equals(organizationId))) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_ASSIGNED_TO_ORGANIZATION", "이미 다른 기관에 소속된 활동지원사입니다.");
        }
    }

    private void lockWorker(Long userId) {
        userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));
    }

    private void lockRecipient(Long recipientId) {
        careRecipientRepository.findForUpdate(recipientId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CARE_RECIPIENT_NOT_FOUND", "당사자를 찾을 수 없습니다."));
    }

    private void endMemberAssignments(Long organizationId, Long userId) {
        careAssignmentRepository.findByOrganizationIdAndSupportWorkerIdAndEndedAtIsNull(organizationId, userId)
                .forEach(CareAssignment::end);
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

    private String normalizePublicCode(String rawCode, String prefix) {
        String code = rawCode == null ? "" : rawCode.trim().toUpperCase(Locale.ROOT);
        if (!code.matches(prefix + "[A-Z0-9]{8}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PUBLIC_CODE", "고유 코드 형식이 올바르지 않습니다.");
        }
        return code;
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));
    }
}
