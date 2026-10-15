package com.project.backend.auth.service;

import com.project.backend.auth.dto.GoogleAuthResult;
import com.project.backend.auth.dto.GoogleRegisterRequest;
import com.project.backend.auth.dto.SessionResult;
import com.project.backend.auth.dto.UserInfo;
import com.project.backend.auth.entity.Consent;
import com.project.backend.auth.entity.RefreshToken;
import com.project.backend.auth.repository.ConsentRepository;
import com.project.backend.auth.repository.RefreshTokenRepository;
import com.project.backend.auth.service.PublicCodeGenerator;
import com.project.backend.common.exception.ApiException;
import com.project.backend.common.security.JwtProvider;
import com.project.backend.user.entity.User;
import com.project.backend.user.repository.UserRepository;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
public class GoogleAuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ConsentRepository consentRepository;
    private final PublicCodeGenerator publicCodeGenerator;
    private final JwtProvider jwtProvider;
    private final GoogleTokenVerifier tokenVerifier;
    private final int refreshTokenExpiryDays;

    public GoogleAuthService(UserRepository userRepository,
                             RefreshTokenRepository refreshTokenRepository,
                             ConsentRepository consentRepository,
                             PublicCodeGenerator publicCodeGenerator,
                             JwtProvider jwtProvider,
                             GoogleTokenVerifier tokenVerifier,
                             @Value("${jwt.refresh-token-expiry-days:30}") int refreshTokenExpiryDays) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.consentRepository = consentRepository;
        this.publicCodeGenerator = publicCodeGenerator;
        this.jwtProvider = jwtProvider;
        this.tokenVerifier = tokenVerifier;
        this.refreshTokenExpiryDays = refreshTokenExpiryDays;
    }

    public SessionResult<GoogleAuthResult> authenticate(String idToken) {
        GoogleUserInfo googleUser = tokenVerifier.verify(idToken);

        Optional<User> byGoogleId = userRepository.findByGoogleId(googleUser.googleId());
        if (byGoogleId.isPresent()) {
            return issueTokens(byGoogleId.get());
        }

        Optional<User> byEmail = userRepository.findByEmail(googleUser.email());
        if (byEmail.isPresent()) {
            return issueTokens(byEmail.get());
        }

        return new SessionResult<>(GoogleAuthResult.requiresConsent(
                googleUser.email(),
                googleUser.name(),
                jwtProvider.generatePendingGoogleToken(googleUser.googleId(), googleUser.email(), googleUser.name())),
                null);
    }

    public SessionResult<GoogleAuthResult> register(GoogleRegisterRequest request) {
        Claims consentClaims = jwtProvider.parseConsentTicket(request.consentTicket());
        Claims googleClaims = jwtProvider.parsePendingGoogleToken(request.pendingToken());

        String email = googleClaims.get("email", String.class);
        String name = googleClaims.get("name", String.class);
        String googleId = googleClaims.get("googleId", String.class);

        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "이미 사용 중인 이메일입니다.");
        }

        User user = User.builder()
                .name(name)
                .email(email)
                .googleId(googleId)
                .publicCode(publicCodeGenerator.generate(request.role()))
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

        return issueTokens(user);
    }

    private SessionResult<GoogleAuthResult> issueTokens(User user) {
        String accessToken = jwtProvider.generateAccessToken(user.getId(), user.getRole().name());
        String raw = jwtProvider.generateRefreshTokenValue();
        String hash = jwtProvider.hashRefreshToken(raw);
        refreshTokenRepository.save(RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(hash)
                .expiryDays(refreshTokenExpiryDays)
                .build());
        return new SessionResult<>(GoogleAuthResult.success(accessToken, UserInfo.from(user)), raw);
    }
}
