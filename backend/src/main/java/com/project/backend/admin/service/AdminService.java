package com.project.backend.admin.service;

import com.project.backend.admin.dto.AdminOrganizationResponse;
import com.project.backend.admin.dto.AdminStatsResponse;
import com.project.backend.admin.dto.CreateAdminOrganizationRequest;
import com.project.backend.admin.dto.UserSummaryResponse;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.organization.entity.Organization;
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
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
    private final DailyRecordRepository dailyRecordRepository;

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
