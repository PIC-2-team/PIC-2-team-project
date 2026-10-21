package com.project.backend.common.config;

import com.project.backend.auth.entity.Consent;
import com.project.backend.auth.repository.ConsentRepository;
import com.project.backend.auth.service.PublicCodeGenerator;
import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationMember;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import com.project.backend.organization.entity.OrganizationRecipientLink;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.seed-test-accounts", havingValue = "true")
@RequiredArgsConstructor
public class DevDataInitializer implements CommandLineRunner {

    private static final String TEST_PASSWORD = "Test1234!";
    private static final String TERMS_VERSION = "1.0";

    private static final String SEED_RECIPIENT_NUMBER = "R-TEST0001";
    private static final String SEED_ORG_CODE = "ORG-TEST0001";
    private static final String SEED_ASSIGNMENT_KEY = "seed-assignment-worker-1";

    private final UserRepository userRepository;
    private final ConsentRepository consentRepository;
    private final PasswordEncoder passwordEncoder;
    private final PublicCodeGenerator publicCodeGenerator;
    private final CareRecipientRepository careRecipientRepository;
    private final CareGuardianRepository careGuardianRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final OrganizationRecipientLinkRepository organizationRecipientLinkRepository;
    private final CareAssignmentRepository careAssignmentRepository;

    @Override
    public void run(String... args) {
        User guardian = getOrCreateTestUser("guardian@test.com", "테스트 보호자", "010-0000-0001", UserRole.GUARDIAN);
        User worker = getOrCreateTestUser("worker@test.com", "테스트 요양사", "010-0000-0002", UserRole.SUPPORT_WORKER);
        User institution = getOrCreateTestUser("institution@test.com", "테스트 기관", "010-0000-0003", UserRole.INSTITUTION);
        getOrCreateTestUser("admin@test.com", "테스트 관리자", "010-0000-0004", UserRole.ADMIN);
        log.info("[Dev] 테스트 계정 4개 확인/생성 완료 (비밀번호: {})", TEST_PASSWORD);

        CareRecipient recipient = getOrCreateCareRecipient(SEED_RECIPIENT_NUMBER, "김삼결",
                LocalDate.of(2010, 5, 15), Gender.MALE, 1, "뇌병변");
        linkGuardian(recipient, guardian);

        Organization org = getOrCreateOrganization(institution, "테스트 돌봄복지관", SEED_ORG_CODE);
        addOrganizationMember(org, worker);
        linkOrganizationAndRecipient(org, recipient, guardian);
        assignSupportWorker(org, recipient, worker);

        log.info("[Dev] 테스트 당사자 및 활동지원사({}) 배정 시딩 완료", worker.getEmail());
    }

    private User getOrCreateTestUser(String email, String name, String phone, UserRole role) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User user = userRepository.save(User.builder()
                    .email(email)
                    .name(name)
                    .phone(phone)
                    .password(passwordEncoder.encode(TEST_PASSWORD))
                    .publicCode(publicCodeGenerator.generate(role))
                    .role(role)
                    .build());

            consentRepository.save(Consent.builder()
                    .userId(user.getId())
                    .basicInfo(true)
                    .sensitiveInfo(true)
                    .caregiverShare(true)
                    .marketing(false)
                    .termsVersion(TERMS_VERSION)
                    .build());

            log.info("[Seed] 테스트 유저 생성 완료: {}", email);
            return user;
        });
    }

    private CareRecipient getOrCreateCareRecipient(String careRecipientNumber, String name,
                                                  LocalDate birthDate, Gender gender,
                                                  Integer disabilityGrade, String otherDisabilityType) {
        return careRecipientRepository.findByCareRecipientNumber(careRecipientNumber).orElseGet(() -> {
            CareRecipient recipient = careRecipientRepository.save(CareRecipient.builder()
                    .careRecipientNumber(careRecipientNumber)
                    .name(name)
                    .birthDate(birthDate)
                    .gender(gender)
                    .disabilityGrade(disabilityGrade)
                    .otherDisabilityType(otherDisabilityType)
                    .build());
            log.info("[Seed] 테스트 당사자 생성 완료: {} ({})", name, careRecipientNumber);
            return recipient;
        });
    }

    private void linkGuardian(CareRecipient recipient, User guardian) {
        if (!careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                recipient.getId(), guardian.getId(), GuardianStatus.ACTIVE)) {
            careGuardianRepository.save(CareGuardian.builder()
                    .careRecipientId(recipient.getId())
                    .guardianId(guardian.getId())
                    .type(GuardianType.PRIMARY)
                    .status(GuardianStatus.ACTIVE)
                    .build());
            log.info("[Seed] 보호자-당사자 연결 완료: guardianId={}, recipientId={}", guardian.getId(), recipient.getId());
        }
    }

    private Organization getOrCreateOrganization(User owner, String name, String organizationCode) {
        return organizationRepository.findByOrganizationCode(organizationCode).orElseGet(() -> {
            Organization org = organizationRepository.save(Organization.builder()
                    .ownerId(owner.getId())
                    .name(name)
                    .organizationCode(organizationCode)
                    .build());
            log.info("[Seed] 테스트 기관 생성 완료: {} ({})", name, organizationCode);
            return org;
        });
    }

    private void addOrganizationMember(Organization org, User worker) {
        if (!organizationMemberRepository.existsByOrganizationIdAndUserIdAndStatus(
                org.getId(), worker.getId(), OrganizationMemberStatus.ACTIVE)) {
            organizationMemberRepository.save(OrganizationMember.builder()
                    .organizationId(org.getId())
                    .userId(worker.getId())
                    .build());
            log.info("[Seed] 기관 멤버 등록 완료: orgId={}, workerId={}", org.getId(), worker.getId());
        }
    }

    private void linkOrganizationAndRecipient(Organization org, CareRecipient recipient, User requestedBy) {
        if (organizationRecipientLinkRepository
                .findByOrganizationIdAndCareRecipientId(org.getId(), recipient.getId()).isEmpty()) {
            OrganizationRecipientLink link = OrganizationRecipientLink.builder()
                    .organizationId(org.getId())
                    .careRecipientId(recipient.getId())
                    .requestedById(requestedBy.getId())
                    .build();
            link.accept();
            organizationRecipientLinkRepository.save(link);
            log.info("[Seed] 기관-당사자 수락 링크 생성 완료: orgId={}, recipientId={}", org.getId(), recipient.getId());
        }
    }

    private void assignSupportWorker(Organization org, CareRecipient recipient, User worker) {
        if (!careAssignmentRepository.existsByIdempotencyKey(SEED_ASSIGNMENT_KEY)) {
            careAssignmentRepository.save(CareAssignment.builder()
                    .organizationId(org.getId())
                    .careRecipientId(recipient.getId())
                    .supportWorkerId(worker.getId())
                    .idempotencyKey(SEED_ASSIGNMENT_KEY)
                    .startDate(LocalDate.now().minusDays(30))
                    .endDate(null)
                    .build());
            log.info("[Seed] 활동지원사 배정 완료: workerId={}, recipientId={}", worker.getId(), recipient.getId());
        }
    }
}
