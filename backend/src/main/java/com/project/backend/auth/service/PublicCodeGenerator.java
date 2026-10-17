package com.project.backend.auth.service;

import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
@RequiredArgsConstructor
public class PublicCodeGenerator {

    private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int SUFFIX_LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;

    public String generate(UserRole role) {
        String prefix = switch (role) {
            case GUARDIAN -> "P-";
            case SUPPORT_WORKER -> "S-";
            case INSTITUTION -> "I-";
            case ADMIN -> "A-";
        };

        String code;
        do {
            code = prefix + randomSuffix();
        } while (userRepository.existsByPublicCode(code));

        return code;
    }

    private String randomSuffix() {
        StringBuilder sb = new StringBuilder(SUFFIX_LENGTH);
        for (int i = 0; i < SUFFIX_LENGTH; i++) {
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        }
        return sb.toString();
    }
}
