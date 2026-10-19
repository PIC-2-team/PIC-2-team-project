package com.project.backend.admin.service;

import com.project.backend.admin.dto.AdminStatsResponse;
import com.project.backend.admin.dto.UserSummaryResponse;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.record.repository.DailyRecordRepository;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

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
}
