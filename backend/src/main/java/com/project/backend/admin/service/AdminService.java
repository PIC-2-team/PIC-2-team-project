package com.project.backend.admin.service;

import com.project.backend.admin.dto.*;
import com.project.backend.care.entity.CareGuardian;
import com.project.backend.care.entity.CareRecipient;
import com.project.backend.care.entity.CareRecipientDisability;
import com.project.backend.care.entity.DisabilityType;
import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.entity.GuardianType;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientDisabilityRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.care.service.CareRecipientNumberGenerator;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationRecipientLink;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.record.repository.DailyRecordRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    private final CareRecipientDisabilityRepository disabilityRepository;
    private final CareGuardianRepository careGuardianRepository;
    private final OrganizationRecipientLinkRepository organizationRecipientLinkRepository;
    private final OrganizationRepository organizationRepository;
    private final DailyRecordRepository dailyRecordRepository;
    private final CareRecipientNumberGenerator numberGenerator;

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

    public Page<UserSummaryResponse> getUsers(UserRole role, Pageable pageable) {
        if (role != null) {
            return userRepository.findByRole(role, pageable).map(UserSummaryResponse::from);
        }
        return userRepository.findAll(pageable).map(UserSummaryResponse::from);
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
    public AdminCareRecipientResponse createCareRecipient(CreateAdminCareRecipientRequest request) {
        String code = numberGenerator.generate();
        CareRecipient recipient = CareRecipient.builder()
                .careRecipientNumber(code)
                .name(request.name().trim())
                .birthDate(request.birthDate())
                .gender(request.gender())
                .disabilityGrade(request.disabilityGrade())
                .otherDisabilityType(request.otherDisabilityType())
                .build();
        recipient = careRecipientRepository.save(recipient);

        Long recipientId = recipient.getId();
        List<DisabilityType> disabilities = request.disabilityTypes() != null ? request.disabilityTypes() : List.of();
        if (!disabilities.isEmpty()) {
            disabilityRepository.saveAll(disabilities.stream()
                    .map(dt -> CareRecipientDisability.builder()
                            .careRecipientId(recipientId)
                            .disabilityType(dt)
                            .build())
                    .toList());
        }

        return AdminCareRecipientResponse.of(recipient, disabilities, null, null, null);
    }

    public List<AdminCareRecipientResponse> getCareRecipients(String search) {
        List<CareRecipient> recipients;
        if (search != null && !search.trim().isEmpty()) {
            String keyword = search.trim();
            recipients = careRecipientRepository
                    .findByNameContainingIgnoreCaseOrCareRecipientNumberContainingIgnoreCaseOrderByCreatedAtDesc(keyword, keyword);
        } else {
            recipients = careRecipientRepository.findAllByOrderByCreatedAtDesc();
        }

        if (recipients.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> recipientIds = recipients.stream().map(CareRecipient::getId).toList();

        // 장애유형 매핑
        Map<Long, List<DisabilityType>> disabilityMap = disabilityRepository
                .findByCareRecipientIdIn(recipientIds).stream()
                .collect(Collectors.groupingBy(
                        CareRecipientDisability::getCareRecipientId,
                        Collectors.mapping(CareRecipientDisability::getDisabilityType, Collectors.toList())
                ));

        // 주 보호자 매핑
        List<CareGuardian> primaryGuardians = careGuardianRepository
                .findByCareRecipientIdInAndTypeAndStatus(recipientIds, GuardianType.PRIMARY, GuardianStatus.ACTIVE);
        Map<Long, Long> recipientToGuardianId = primaryGuardians.stream()
                .collect(Collectors.toMap(CareGuardian::getCareRecipientId, CareGuardian::getGuardianId, (a, b) -> a));

        List<Long> guardianUserIds = new ArrayList<>(recipientToGuardianId.values());
        Map<Long, User> guardianUserMap = guardianUserIds.isEmpty() ? Collections.emptyMap() :
                userRepository.findAllById(guardianUserIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));

        // 승인된 기관 매핑
        List<OrganizationRecipientLink> orgLinks = organizationRecipientLinkRepository
                .findByCareRecipientIdInAndStatus(recipientIds, LinkStatus.ACCEPTED);
        Map<Long, Long> recipientToOrgId = orgLinks.stream()
                .collect(Collectors.toMap(OrganizationRecipientLink::getCareRecipientId, OrganizationRecipientLink::getOrganizationId, (a, b) -> a));

        List<Long> orgIds = new ArrayList<>(recipientToOrgId.values());
        Map<Long, String> orgNameMap = orgIds.isEmpty() ? Collections.emptyMap() :
                organizationRepository.findAllById(orgIds).stream()
                        .collect(Collectors.toMap(Organization::getId, Organization::getName));

        return recipients.stream().map(r -> {
            List<DisabilityType> dtList = disabilityMap.getOrDefault(r.getId(), List.of());
            Long guardianId = recipientToGuardianId.get(r.getId());
            User guardian = guardianId != null ? guardianUserMap.get(guardianId) : null;
            String guardianName = guardian != null ? guardian.getName() : null;
            String guardianEmail = guardian != null ? guardian.getEmail() : null;

            Long orgId = recipientToOrgId.get(r.getId());
            String orgName = orgId != null ? orgNameMap.get(orgId) : null;

            return AdminCareRecipientResponse.of(r, dtList, guardianName, guardianEmail, orgName);
        }).toList();
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
