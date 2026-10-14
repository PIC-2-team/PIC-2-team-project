package com.project.backend.auth.service;

import com.project.backend.auth.dto.GoogleAuthResult;
import com.project.backend.auth.dto.UserInfo;
import com.project.backend.auth.entity.RefreshToken;
import com.project.backend.auth.repository.RefreshTokenRepository;
import com.project.backend.common.security.JwtProvider;
import com.project.backend.user.entity.User;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
public class GoogleAuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProvider jwtProvider;
    private final GoogleTokenVerifier tokenVerifier;
    private final int refreshTokenExpiryDays;

    public GoogleAuthService(UserRepository userRepository,
                             RefreshTokenRepository refreshTokenRepository,
                             JwtProvider jwtProvider,
                             GoogleTokenVerifier tokenVerifier,
                             @Value("${jwt.refresh-token-expiry-days:30}") int refreshTokenExpiryDays) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtProvider = jwtProvider;
        this.tokenVerifier = tokenVerifier;
        this.refreshTokenExpiryDays = refreshTokenExpiryDays;
    }

    public GoogleAuthResult authenticate(String idToken) {
        GoogleUserInfo googleUser = tokenVerifier.verify(idToken);

        Optional<User> byGoogleId = userRepository.findByGoogleId(googleUser.googleId());
        if (byGoogleId.isPresent()) {
            return issueTokens(byGoogleId.get());
        }

        Optional<User> byEmail = userRepository.findByEmail(googleUser.email());
        if (byEmail.isPresent()) {
            return issueTokens(byEmail.get());
        }

        return GoogleAuthResult.requiresConsent(googleUser.email(), googleUser.name());
    }

    private GoogleAuthResult issueTokens(User user) {
        String accessToken = jwtProvider.generateAccessToken(user.getId(), user.getRole().name());
        String raw = jwtProvider.generateRefreshTokenValue();
        String hash = jwtProvider.hashRefreshToken(raw);
        refreshTokenRepository.save(RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(hash)
                .expiryDays(refreshTokenExpiryDays)
                .build());
        return GoogleAuthResult.success(accessToken, UserInfo.from(user));
    }
}
