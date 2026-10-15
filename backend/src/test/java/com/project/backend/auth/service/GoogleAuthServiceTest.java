package com.project.backend.auth.service;

import com.project.backend.auth.dto.AuthResponse;
import com.project.backend.auth.dto.GoogleAuthResult;
import com.project.backend.auth.repository.RefreshTokenRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.common.security.JwtProvider;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class GoogleAuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock JwtProvider jwtProvider;
    @Mock GoogleTokenVerifier tokenVerifier;

    GoogleAuthService googleAuthService;

    @BeforeEach
    void setUp() {
        googleAuthService = new GoogleAuthService(
                userRepository, refreshTokenRepository, jwtProvider, tokenVerifier, 30);
    }

    @Test
    void authenticate_기존_사용자는_토큰_발급() {
        given(tokenVerifier.verify("valid-id-token"))
                .willReturn(new GoogleUserInfo("gid-1", "user@gmail.com", "홍길동"));
        User user = existingUser(1L, "gid-1");
        given(userRepository.findByGoogleId("gid-1")).willReturn(Optional.of(user));
        given(jwtProvider.generateAccessToken(1L, "GUARDIAN")).willReturn("access-token");
        given(jwtProvider.generateRefreshTokenValue()).willReturn("raw-refresh");
        given(jwtProvider.hashRefreshToken("raw-refresh")).willReturn("hashed");
        given(refreshTokenRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        GoogleAuthResult result = googleAuthService.authenticate("valid-id-token");

        assertThat(result.requiresConsent()).isFalse();
        assertThat(result.accessToken()).isEqualTo("access-token");
        assertThat(result.refreshToken()).isEqualTo("raw-refresh");
        assertThat(result.user().name()).isEqualTo("홍길동");
    }

    @Test
    void authenticate_이메일_일치_사용자도_토큰_발급() {
        given(tokenVerifier.verify("valid-id-token"))
                .willReturn(new GoogleUserInfo("gid-new", "user@gmail.com", "홍길동"));
        given(userRepository.findByGoogleId("gid-new")).willReturn(Optional.empty());
        User user = existingUser(1L, null);
        given(userRepository.findByEmail("user@gmail.com")).willReturn(Optional.of(user));
        given(jwtProvider.generateAccessToken(1L, "GUARDIAN")).willReturn("access-token");
        given(jwtProvider.generateRefreshTokenValue()).willReturn("raw-refresh");
        given(jwtProvider.hashRefreshToken("raw-refresh")).willReturn("hashed");
        given(refreshTokenRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        GoogleAuthResult result = googleAuthService.authenticate("valid-id-token");

        assertThat(result.requiresConsent()).isFalse();
        assertThat(result.accessToken()).isEqualTo("access-token");
        assertThat(result.refreshToken()).isEqualTo("raw-refresh");
    }

    @Test
    void authenticate_신규_사용자는_requiresConsent_반환() {
        given(tokenVerifier.verify("valid-id-token"))
                .willReturn(new GoogleUserInfo("gid-new", "new@gmail.com", "신규유저"));
        given(userRepository.findByGoogleId("gid-new")).willReturn(Optional.empty());
        given(userRepository.findByEmail("new@gmail.com")).willReturn(Optional.empty());

        GoogleAuthResult result = googleAuthService.authenticate("valid-id-token");

        assertThat(result.requiresConsent()).isTrue();
        assertThat(result.googleEmail()).isEqualTo("new@gmail.com");
        assertThat(result.googleName()).isEqualTo("신규유저");
        assertThat(result.accessToken()).isNull();
    }

    @Test
    void authenticate_유효하지_않은_토큰은_UNAUTHORIZED() {
        given(tokenVerifier.verify(anyString()))
                .willThrow(new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN", "유효하지 않은 Google 토큰입니다."));

        assertThatThrownBy(() -> googleAuthService.authenticate("bad-token"))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private User existingUser(Long id, String googleId) {
        User u = User.builder()
                .name("홍길동").email("user@gmail.com").publicCode("G-000001")
                .role(UserRole.GUARDIAN).googleId(googleId).build();
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }
}
