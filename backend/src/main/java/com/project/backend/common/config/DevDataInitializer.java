package com.project.backend.common.config;

import com.project.backend.auth.entity.Consent;
import com.project.backend.auth.repository.ConsentRepository;
import com.project.backend.auth.service.PublicCodeGenerator;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.seed-test-accounts", havingValue = "true")
@RequiredArgsConstructor
public class DevDataInitializer implements CommandLineRunner {

    private static final String TEST_PASSWORD = "Test1234!";
    private static final String TERMS_VERSION = "1.0";

    private final UserRepository userRepository;
    private final ConsentRepository consentRepository;
    private final PasswordEncoder passwordEncoder;
    private final PublicCodeGenerator publicCodeGenerator;

    @Override
    public void run(String... args) {
        createTestUser("guardian@test.com", "테스트 보호자", "010-0000-0001", UserRole.GUARDIAN);
        createTestUser("worker@test.com", "테스트 요양사", "010-0000-0002", UserRole.SUPPORT_WORKER);
        createTestUser("institution@test.com", "테스트 기관", "010-0000-0003", UserRole.INSTITUTION);
        createTestUser("admin@test.com", "테스트 관리자", "010-0000-0004", UserRole.ADMIN);
        log.info("[Dev] 테스트 계정 4개 생성 완료 (비밀번호: {})", TEST_PASSWORD);
    }

    private void createTestUser(String email, String name, String phone, UserRole role) {
        if (userRepository.findByEmail(email).isPresent()) {
            log.info("[Seed] 이미 존재하는 계정 건너뜀: {}", email);
            return;
        }

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
    }
}
