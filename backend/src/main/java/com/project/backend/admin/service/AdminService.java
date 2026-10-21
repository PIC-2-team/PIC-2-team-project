package com.project.backend.admin.service;

import com.project.backend.admin.dto.*;
import com.project.backend.auth.entity.Consent;
import com.project.backend.auth.repository.ConsentRepository;
import com.project.backend.auth.service.PublicCodeGenerator;
import com.project.backend.care.entity.CareRecipient;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationMember;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import com.project.backend.organization.entity.OrganizationRecipientLink;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.record.entity.DailyRecord;
import com.project.backend.record.repository.DailyRecordRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final CareRecipientRepository careRecipientRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final OrganizationRecipientLinkRepository organizationRecipientLinkRepository;
    private final DailyRecordRepository dailyRecordRepository;
    private final PasswordEncoder passwordEncoder;
    private final ConsentRepository consentRepository;
    private final PublicCodeGenerator publicCodeGenerator;

    public AdminStatsResponse getStats() {
        long total = userRepository.count();
        long guardians = userRepository.countByRole(UserRole.GUARDIAN);
        long supportWorkers = userRepository.countByRole(UserRole.SUPPORT_WORKER);
        long institutions = userRepository.countByRole(UserRole.INSTITUTION);
        long orgs = organizationRepository.count();
        long recipients = careRecipientRepository.count();
        long records = dailyRecordRepository.count();

        return new AdminStatsResponse(total, guardians, supportWorkers, institutions, orgs, recipients, records);
    }

    public Page<UserSummaryResponse> getUsers(UserRole role, Long organizationId, Pageable pageable) {
        Page<User> usersPage;
        if (organizationId != null) {
            Organization org = organizationRepository.findById(organizationId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND", "기관을 찾을 수 없습니다."));

            Set<Long> userIds = new HashSet<>();
            if (org.getOwnerId() != null) {
                userIds.add(org.getOwnerId());
            }
            organizationMemberRepository.findByOrganizationId(organizationId).stream()
                    .map(OrganizationMember::getUserId)
                    .forEach(userIds::add);

            if (userIds.isEmpty()) {
                return Page.empty(pageable);
            }

            List<Long> idList = new ArrayList<>(userIds);
            usersPage = role != null
                    ? userRepository.findByIdInAndRole(idList, role, pageable)
                    : userRepository.findByIdIn(idList, pageable);
        } else {
            usersPage = role != null
                    ? userRepository.findByRole(role, pageable)
                    : userRepository.findAll(pageable);
        }

        // 각 사용자의 소속 기관 매핑
        Map<Long, Organization> ownerOrgMap = organizationRepository.findAll().stream()
                .filter(o -> o.getOwnerId() != null)
                .collect(Collectors.toMap(Organization::getOwnerId, o -> o, (existing, replacement) -> existing));

        Map<Long, Long> workerOrgIdMap = organizationMemberRepository.findAll().stream()
                .filter(m -> m.getStatus() == OrganizationMemberStatus.ACTIVE)
                .collect(Collectors.toMap(OrganizationMember::getUserId, OrganizationMember::getOrganizationId, (existing, replacement) -> existing));

        Map<Long, Organization> allOrgs = organizationRepository.findAll().stream()
                .collect(Collectors.toMap(Organization::getId, o -> o));

        return usersPage.map(u -> {
            Long orgId = null;
            String orgName = null;
            if (u.getRole() == UserRole.INSTITUTION && ownerOrgMap.containsKey(u.getId())) {
                Organization o = ownerOrgMap.get(u.getId());
                orgId = o.getId();
                orgName = o.getName();
            } else if (u.getRole() == UserRole.SUPPORT_WORKER && workerOrgIdMap.containsKey(u.getId())) {
                orgId = workerOrgIdMap.get(u.getId());
                if (allOrgs.containsKey(orgId)) {
                    orgName = allOrgs.get(orgId).getName();
                }
            }
            return UserSummaryResponse.from(u, orgId, orgName);
        });
    }

    @Transactional
    public AdminOrganizationResponse createOrganization(CreateAdminOrganizationRequest request) {
        String code = generateUniqueCode();
        Organization org = organizationRepository.save(Organization.builder()
                .name(request.name().trim())
                .organizationCode(code)
                .build());
        return AdminOrganizationResponse.of(org, null);
    }

    @Transactional
    public AdminOrganizationResponse updateOrganization(Long id, UpdateAdminOrganizationRequest request) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND", "기관을 찾을 수 없습니다."));

        org.updateName(request.name().trim());

        String ownerName = null;
        if (org.getOwnerId() != null) {
            ownerName = userRepository.findById(org.getOwnerId()).map(User::getName).orElse(null);
        }
        return AdminOrganizationResponse.of(org, ownerName);
    }

    @Transactional
    public void deleteOrganization(Long id) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND", "기관을 찾을 수 없습니다."));

        // 연관 멤버 및 링크 정리
        List<OrganizationMember> members = organizationMemberRepository.findByOrganizationId(id);
        organizationMemberRepository.deleteAll(members);

        List<OrganizationRecipientLink> links = organizationRecipientLinkRepository.findByOrganizationId(id);
        organizationRecipientLinkRepository.deleteAll(links);

        organizationRepository.delete(org);
    }

    public List<AdminOrganizationResponse> getOrganizations() {
        List<Organization> orgs = organizationRepository.findAllByOrderByCreatedAtDesc();
        List<Long> ownerIds = orgs.stream()
                .map(Organization::getOwnerId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        Map<Long, String> ownerNameMap = ownerIds.isEmpty() ? Collections.emptyMap() :
                userRepository.findAllById(ownerIds).stream()
                        .collect(Collectors.toMap(User::getId, User::getName));

        return orgs.stream()
                .map(org -> AdminOrganizationResponse.of(
                        org,
                        org.getOwnerId() != null ? ownerNameMap.get(org.getOwnerId()) : null
                ))
                .toList();
    }

    @Transactional
    public UserSummaryResponse createUser(CreateAdminUserRequest request) {
        if (userRepository.existsByEmail(request.email().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_EMAIL", "이미 사용 중인 이메일입니다.");
        }

        User user = userRepository.save(User.builder()
                .name(request.name().trim())
                .email(request.email().trim())
                .password(passwordEncoder.encode(request.password()))
                .phone(request.phone() != null ? request.phone().trim() : null)
                .role(request.role())
                .publicCode(publicCodeGenerator.generate(request.role()))
                .build());

        // 기본 약관 동의 생성
        consentRepository.save(Consent.builder()
                .userId(user.getId())
                .basicInfo(true)
                .sensitiveInfo(true)
                .caregiverShare(true)
                .marketing(false)
                .termsVersion("1.0")
                .build());

        Long orgId = null;
        String orgName = null;
        if (request.organizationId() != null) {
            Organization org = organizationRepository.findById(request.organizationId()).orElse(null);
            if (org != null) {
                orgId = org.getId();
                orgName = org.getName();
                if (request.role() == UserRole.INSTITUTION) {
                    org.assignOwner(user.getId());
                } else if (request.role() == UserRole.SUPPORT_WORKER) {
                    organizationMemberRepository.save(OrganizationMember.builder()
                            .organizationId(org.getId())
                            .userId(user.getId())
                            .build());
                }
            }
        }

        return UserSummaryResponse.from(user, orgId, orgName);
    }

    @Transactional
    public UserSummaryResponse updateUser(Long id, UpdateAdminUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));

        String newEmail = request.email().trim();
        if (!user.getEmail().equalsIgnoreCase(newEmail) && userRepository.existsByEmail(newEmail)) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_EMAIL", "이미 사용 중인 이메일입니다.");
        }

        user.updateByAdmin(request.name().trim(), newEmail, request.phone(), request.role());

        // 기관 연결 업데이트 (선택)
        Long orgId = null;
        String orgName = null;
        if (request.organizationId() != null) {
            Organization org = organizationRepository.findById(request.organizationId()).orElse(null);
            if (org != null) {
                orgId = org.getId();
                orgName = org.getName();
                if (request.role() == UserRole.INSTITUTION) {
                    org.assignOwner(user.getId());
                } else if (request.role() == UserRole.SUPPORT_WORKER) {
                    if (!organizationMemberRepository.existsByOrganizationIdAndUserIdAndStatus(
                            org.getId(), user.getId(), OrganizationMemberStatus.ACTIVE)) {
                        organizationMemberRepository.save(OrganizationMember.builder()
                                .organizationId(org.getId())
                                .userId(user.getId())
                                .build());
                    }
                }
            }
        }

        return UserSummaryResponse.from(user, orgId, orgName);
    }

    @Transactional
    public void deleteUser(Long id, Long currentAdminId) {
        if (id.equals(currentAdminId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CANNOT_DELETE_SELF", "현재 로그인된 관리자 계정은 삭제할 수 없습니다.");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));

        // 기관 소유자 해제
        organizationRepository.findByOwnerId(id).ifPresent(org -> org.assignOwner(null));

        // 소속 멤버십 삭제
        List<OrganizationMember> memberships = organizationMemberRepository.findByUserIdAndStatus(id, OrganizationMemberStatus.ACTIVE);
        organizationMemberRepository.deleteAll(memberships);

        // 동의 내역 삭제
        consentRepository.deleteByUserId(id);

        userRepository.delete(user);
    }

    public List<AdminRecordSummaryResponse> getUserRecords(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));

        List<DailyRecord> records = dailyRecordRepository.findByAuthorIdAndDeletedAtIsNullOrderByRecordedAtDesc(userId);

        Map<Long, String> recipientNames = careRecipientRepository.findAllById(
                records.stream().map(DailyRecord::getCareRecipientId).distinct().toList()
        ).stream().collect(Collectors.toMap(CareRecipient::getId, CareRecipient::getName));

        return records.stream()
                .map(r -> AdminRecordSummaryResponse.of(r, recipientNames.get(r.getCareRecipientId()), user.getName()))
                .toList();
    }

    public List<AdminRecordSummaryResponse> getOrganizationRecords(Long organizationId) {
        organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND", "기관을 찾을 수 없습니다."));

        List<Long> recipientIds = organizationRecipientLinkRepository.findByOrganizationId(organizationId).stream()
                .map(OrganizationRecipientLink::getCareRecipientId)
                .toList();

        List<Long> workerIds = organizationMemberRepository.findByOrganizationId(organizationId).stream()
                .map(OrganizationMember::getUserId)
                .toList();

        List<DailyRecord> records;
        if (!recipientIds.isEmpty()) {
            records = dailyRecordRepository.findByCareRecipientIdInAndDeletedAtIsNullOrderByRecordedAtDesc(recipientIds);
        } else if (!workerIds.isEmpty()) {
            records = new ArrayList<>();
            for (Long workerId : workerIds) {
                records.addAll(dailyRecordRepository.findByAuthorIdAndDeletedAtIsNullOrderByRecordedAtDesc(workerId));
            }
            records.sort((a, b) -> b.getRecordedAt().compareTo(a.getRecordedAt()));
        } else {
            return Collections.emptyList();
        }

        Map<Long, String> recipientNames = careRecipientRepository.findAllById(
                records.stream().map(DailyRecord::getCareRecipientId).distinct().toList()
        ).stream().collect(Collectors.toMap(CareRecipient::getId, CareRecipient::getName));

        Map<Long, String> authorNames = userRepository.findAllById(
                records.stream().map(DailyRecord::getAuthorId).distinct().toList()
        ).stream().collect(Collectors.toMap(User::getId, User::getName));

        return records.stream()
                .map(r -> AdminRecordSummaryResponse.of(r, recipientNames.get(r.getCareRecipientId()), authorNames.get(r.getAuthorId())))
                .toList();
    }

    private String generateUniqueCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(6);
            for (int i = 0; i < 6; i++) {
                sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
            }
            code = sb.toString();
        } while (organizationRepository.existsByOrganizationCode(code));
        return code;
    }
}
