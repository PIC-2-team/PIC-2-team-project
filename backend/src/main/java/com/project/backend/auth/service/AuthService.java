package com.project.backend.auth.service;

import com.project.backend.auth.dto.*;
import com.project.backend.auth.entity.Consent;
import com.project.backend.auth.entity.RefreshToken;
import com.project.backend.auth.repository.ConsentRepository;
import com.project.backend.auth.repository.RefreshTokenRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.common.security.JwtProvider;
import com.project.backend.user.entity.User;
import com.project.backend.user.repository.UserRepository;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ConsentRepository consentRepository;
    private final PasswordEncoder passwordEncoder;
    private final PublicCodeGenerator publicCodeGenerator;
    private final JwtProvider jwtProvider;
    private final int refreshTokenExpiryDays;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       ConsentRepository consentRepository,
                       PasswordEncoder passwordEncoder,
                       PublicCodeGenerator publicCodeGenerator,
                       JwtProvider jwtProvider,
                       @Value("${jwt.refresh-token-expiry-days:30}") int refreshTokenExpiryDays) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.consentRepository = consentRepository;
        this.passwordEncoder = passwordEncoder;
        this.publicCodeGenerator = publicCodeGenerator;
        this.jwtProvider = jwtProvider;
        this.refreshTokenExpiryDays = refreshTokenExpiryDays;
    }

    public ConsentResponse issueConsentTicket(ConsentRequest request) {
        Map<String, Object> claims = Map.of(
                "basicInfo", request.basicInfo(),
                "sensitiveInfo", request.sensitiveInfo(),
                "caregiverShare", request.caregiverShare(),
                "marketing", request.marketing(),
                "termsVersion", request.termsVersion()
        );
        return new ConsentResponse(jwtProvider.generateConsentTicket(claims));
    }

    public AuthResponse register(RegisterRequest request) {
        Claims consentClaims = jwtProvider.parseConsentTicket(request.consentTicket());

        if (userRepository.existsByEmail(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "이미 사용 중인 이메일입니다.");
        }

        String publicCode = publicCodeGenerator.generate(request.role());
        String encodedPassword = request.password() != null
                ? passwordEncoder.encode(request.password()) : null;

        User user = User.builder()
                .name(request.name())
                .email(request.email())
                .password(encodedPassword)
                .phone(request.phone())
                .publicCode(publicCode)
                .role(request.role())
                .build();
        user = userRepository.save(user);

        consentRepository.save(Consent.builder()
                .userId(user.getId())
                .basicInfo(Boolean.TRUE.equals(consentClaims.get("basicInfo", Boolean.class)))
                .sensitiveInfo(Boolean.TRUE.equals(consentClaims.get("sensitiveInfo", Boolean.class)))
                .caregiverShare(Boolean.TRUE.equals(consentClaims.get("caregiverShare", Boolean.class)))
                .marketing(Boolean.TRUE.equals(consentClaims.get("marketing", Boolean.class)))
                .termsVersion(consentClaims.get("termsVersion", String.class))
                .build());

        String accessToken = jwtProvider.generateAccessToken(user.getId(), user.getRole().name());
        saveRefreshToken(user.getId());

        return new AuthResponse(accessToken, UserInfo.from(user));
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        String accessToken = jwtProvider.generateAccessToken(user.getId(), user.getRole().name());
        saveRefreshToken(user.getId());

        return new AuthResponse(accessToken, UserInfo.from(user));
    }

    public RefreshResponse refresh(String rawRefreshToken) {
        String hash = jwtProvider.hashRefreshToken(rawRefreshToken);
        RefreshToken rt = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "유효하지 않은 refresh token입니다."));

        if (rt.isRevoked()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_REVOKED", "이미 무효화된 refresh token입니다.");
        }
        if (rt.isExpired()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_EXPIRED", "만료된 refresh token입니다.");
        }

        User user = userRepository.findById(rt.getUserId())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));

        rt.revoke();
        refreshTokenRepository.save(rt);
        saveRefreshToken(user.getId());

        return new RefreshResponse(jwtProvider.generateAccessToken(user.getId(), user.getRole().name()));
    }

    public void logout(String rawRefreshToken) {
        String hash = jwtProvider.hashRefreshToken(rawRefreshToken);
        refreshTokenRepository.findByTokenHash(hash).ifPresent(rt -> {
            rt.revoke();
            refreshTokenRepository.save(rt);
        });
    }

    private String saveRefreshToken(Long userId) {
        String raw = jwtProvider.generateRefreshTokenValue();
        String hash = jwtProvider.hashRefreshToken(raw);
        refreshTokenRepository.save(RefreshToken.builder()
                .userId(userId)
                .tokenHash(hash)
                .expiryDays(refreshTokenExpiryDays)
                .build());
        return raw;
    }
}
