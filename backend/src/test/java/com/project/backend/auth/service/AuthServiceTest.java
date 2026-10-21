package com.project.backend.auth.service;

import com.project.backend.auth.dto.*;
import com.project.backend.auth.entity.Consent;
import com.project.backend.auth.entity.RefreshToken;
import com.project.backend.auth.repository.ConsentRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String TEST_SECRET = "test-secret-key-must-be-at-least-32-characters-long";

    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock ConsentRepository consentRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock PublicCodeGenerator publicCodeGenerator;

    private JwtProvider jwtProvider;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        jwtProvider = new JwtProvider(TEST_SECRET, 900L);
        authService = new AuthService(
                userRepository, refreshTokenRepository, consentRepository,
                passwordEncoder, publicCodeGenerator, jwtProvider, 30
        );
    }

    // ─── login ───────────────────────────────────────────────────────────────

    @Test
    void login_올바른_이메일과_비밀번호로_accessToken_반환() {
        User user = userWithId(1L);
        given(userRepository.findByEmail("test@example.com")).willReturn(Optional.of(user));
        given(passwordEncoder.matches("rawpw", "encodedpw")).willReturn(true);
        given(refreshTokenRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        SessionResult<AuthResponse> session = authService.login(new LoginRequest("test@example.com", "rawpw"));

        assertThat(jwtProvider.isValid(session.data().accessToken())).isTrue();
        assertThat(jwtProvider.extractUserId(session.data().accessToken())).isEqualTo(1L);
        assertThat(jwtProvider.extractRole(session.data().accessToken())).isEqualTo("GUARDIAN");
        assertThat(session.rawRefreshToken()).isNotNull();
    }

    @Test
    void login_존재하지_않는_이메일로_UNAUTHORIZED_예외() {
        given(userRepository.findByEmail(anyString())).willReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("none@example.com", "pw")))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void login_틀린_비밀번호로_UNAUTHORIZED_예외() {
        given(userRepository.findByEmail(anyString())).willReturn(Optional.of(userWithId(1L)));
        given(passwordEncoder.matches(anyString(), anyString())).willReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("test@example.com", "wrong")))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ─── register ────────────────────────────────────────────────────────────

    @Test
    void register_유효한_consentTicket으로_User_Consent_RefreshToken_저장_후_accessToken_반환() {
        String ticket = jwtProvider.generateConsentTicket(Map.of(
                "basicInfo", true, "sensitiveInfo", true,
                "caregiverShare", false, "marketing", false, "termsVersion", "1.0"
        ));

        given(userRepository.existsByEmail(anyString())).willReturn(false);
        given(passwordEncoder.encode(anyString())).willReturn("encoded");
        given(publicCodeGenerator.generate(any())).willReturn("P-ABCD1234");
        given(userRepository.save(any())).willAnswer(inv -> {
            User saved = inv.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 1L);
            return saved;
        });
        given(consentRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(refreshTokenRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        RegisterRequest req = new RegisterRequest(ticket, "홍길동", "test@example.com", "password123", null, UserRole.GUARDIAN);
        SessionResult<AuthResponse> session = authService.register(req);

        assertThat(jwtProvider.isValid(session.data().accessToken())).isTrue();
        assertThat(session.rawRefreshToken()).isNotNull();
        verify(userRepository).save(any(User.class));
        verify(consentRepository).save(any(Consent.class));
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void register_이미_사용중인_이메일로_CONFLICT_예외() {
        String ticket = jwtProvider.generateConsentTicket(Map.of(
                "basicInfo", true, "sensitiveInfo", true,
                "caregiverShare", false, "marketing", false, "termsVersion", "1.0"
        ));
        given(userRepository.existsByEmail("taken@example.com")).willReturn(true);

        assertThatThrownBy(() -> authService.register(
                new RegisterRequest(ticket, "홍길동", "taken@example.com", "pw12345678", null, UserRole.GUARDIAN)))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void register_유효하지_않은_consentTicket으로_UNAUTHORIZED_예외() {
        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("invalid.ticket.value", "홍길동", "test@example.com", "pw12345678", null, UserRole.GUARDIAN)))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ─── refresh ─────────────────────────────────────────────────────────────

    @Test
    void refresh_유효한_refreshToken으로_새_accessToken_반환() {
        String rawToken = jwtProvider.generateRefreshTokenValue();
        String hash = jwtProvider.hashRefreshToken(rawToken);
        RefreshToken rt = validRefreshToken(1L, hash);

        given(refreshTokenRepository.findByTokenHash(hash)).willReturn(Optional.of(rt));
        given(userRepository.findById(1L)).willReturn(Optional.of(userWithId(1L)));
        given(refreshTokenRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        SessionResult<RefreshResponse> session = authService.refresh(rawToken);

        assertThat(jwtProvider.isValid(session.data().accessToken())).isTrue();
        assertThat(jwtProvider.extractUserId(session.data().accessToken())).isEqualTo(1L);
        assertThat(session.rawRefreshToken()).isNotNull();
    }

    @Test
    void refresh_만료된_refreshToken으로_UNAUTHORIZED_예외() {
        String rawToken = "expired-token";
        String hash = jwtProvider.hashRefreshToken(rawToken);
        RefreshToken expired = expiredRefreshToken(1L, hash);

        given(refreshTokenRepository.findByTokenHash(hash)).willReturn(Optional.of(expired));

        assertThatThrownBy(() -> authService.refresh(rawToken))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void refresh_revoke된_refreshToken으로_UNAUTHORIZED_예외() {
        String rawToken = "revoked-token";
        String hash = jwtProvider.hashRefreshToken(rawToken);
        RefreshToken revoked = revokedRefreshToken(1L, hash);

        given(refreshTokenRepository.findByTokenHash(hash)).willReturn(Optional.of(revoked));

        assertThatThrownBy(() -> authService.refresh(rawToken))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void refresh_존재하지_않는_refreshToken으로_UNAUTHORIZED_예외() {
        given(refreshTokenRepository.findByTokenHash(anyString())).willReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh("unknown-token"))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ─── findEmail ────────────────────────────────────────────────────────────

    @Test
    void findEmail_이름과_전화번호가_일치하면_마스킹된_이메일_반환() {
        User user = User.builder()
                .name("홍길동")
                .email("honggildong@example.com")
                .phone("010-1234-5678")
                .publicCode("P-ABCD1234")
                .role(UserRole.GUARDIAN)
                .build();
        ReflectionTestUtils.setField(user, "id", 1L);

        given(userRepository.findByName("홍길동")).willReturn(java.util.List.of(user));

        FindEmailResponse res = authService.findEmail(new FindEmailRequest("홍길동", "01012345678"));

        assertThat(res.email()).isEqualTo("hon********@example.com");
    }

    @Test
    void findEmail_일치하는_사용자가_없으면_NOT_FOUND_예외() {
        given(userRepository.findByName("홍길동")).willReturn(java.util.List.of());

        assertThatThrownBy(() -> authService.findEmail(new FindEmailRequest("홍길동", "01012345678")))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ─── resetPassword ────────────────────────────────────────────────────────

    @Test
    void resetPassword_정보가_모두_일치하면_비밀번호_암호화_후_업데이트() {
        User user = User.builder()
                .name("홍길동")
                .email("hong@example.com")
                .password("oldEncoded")
                .phone("010-1234-5678")
                .publicCode("P-ABCD1234")
                .role(UserRole.GUARDIAN)
                .build();
        ReflectionTestUtils.setField(user, "id", 1L);

        given(userRepository.findByEmail("hong@example.com")).willReturn(Optional.of(user));
        given(passwordEncoder.encode("newPassword123")).willReturn("newEncoded");

        authService.resetPassword(new ResetPasswordRequest("홍길동", "01012345678", "hong@example.com", "newPassword123"));

        assertThat(user.getPassword()).isEqualTo("newEncoded");
    }

    @Test
    void resetPassword_전화번호가_일치하지_않으면_BAD_REQUEST_예외() {
        User user = User.builder()
                .name("홍길동")
                .email("hong@example.com")
                .password("oldEncoded")
                .phone("010-9999-9999")
                .publicCode("P-ABCD1234")
                .role(UserRole.GUARDIAN)
                .build();

        given(userRepository.findByEmail("hong@example.com")).willReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.resetPassword(
                new ResetPasswordRequest("홍길동", "01012345678", "hong@example.com", "newPassword123")))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void resetPassword_소셜로그인_계정인_경우_BAD_REQUEST_예외() {
        User user = User.builder()
                .name("홍길동")
                .email("google@example.com")
                .password(null)
                .googleId("google-12345")
                .phone("010-1234-5678")
                .publicCode("P-ABCD1234")
                .role(UserRole.GUARDIAN)
                .build();

        given(userRepository.findByEmail("google@example.com")).willReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.resetPassword(
                new ResetPasswordRequest("홍길동", "01012345678", "google@example.com", "newPassword123")))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private User userWithId(Long id) {
        User user = User.builder()
                .name("홍길동")
                .email("test@example.com")
                .password("encodedpw")
                .publicCode("P-ABCD1234")
                .role(UserRole.GUARDIAN)
                .build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private RefreshToken validRefreshToken(Long userId, String hash) {
        return RefreshToken.builder().userId(userId).tokenHash(hash).expiryDays(30).build();
    }

    private RefreshToken expiredRefreshToken(Long userId, String hash) {
        RefreshToken rt = RefreshToken.builder().userId(userId).tokenHash(hash).expiryDays(30).build();
        ReflectionTestUtils.setField(rt, "expiresAt", LocalDateTime.now().minusDays(1));
        return rt;
    }

    private RefreshToken revokedRefreshToken(Long userId, String hash) {
        RefreshToken rt = RefreshToken.builder().userId(userId).tokenHash(hash).expiryDays(30).build();
        ReflectionTestUtils.setField(rt, "revokedAt", LocalDateTime.now().minusMinutes(5));
        return rt;
    }
}
