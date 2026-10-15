package com.project.backend.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class JwtProviderTest {

    private static final String SECRET = "test-secret-key-must-be-at-least-32-characters-long";
    private JwtProvider jwtProvider;

    @BeforeEach
    void setUp() {
        jwtProvider = new JwtProvider(SECRET, 900L);
    }

    @Test
    void generateAccessToken_userId와_role_claim을_가진_유효한_JWT_생성() {
        String token = jwtProvider.generateAccessToken(42L, "GUARDIAN");

        assertThat(jwtProvider.isValid(token)).isTrue();
        assertThat(jwtProvider.extractUserId(token)).isEqualTo(42L);
        assertThat(jwtProvider.extractRole(token)).isEqualTo("GUARDIAN");
    }

    @Test
    void isValid_만료된_토큰에_false_반환() {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        String expiredToken = Jwts.builder()
                .subject("1")
                .claim("role", "GUARDIAN")
                .expiration(Date.from(Instant.now().minusSeconds(1)))
                .signWith(key)
                .compact();

        assertThat(jwtProvider.isValid(expiredToken)).isFalse();
    }

    @Test
    void isValid_변조된_토큰에_false_반환() {
        String token = jwtProvider.generateAccessToken(1L, "GUARDIAN");
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";

        assertThat(jwtProvider.isValid(tampered)).isFalse();
    }

    @Test
    void hashRefreshToken_같은_입력에_같은_해시_반환() {
        String raw = "some-uuid-refresh-token";

        assertThat(jwtProvider.hashRefreshToken(raw)).isEqualTo(jwtProvider.hashRefreshToken(raw));
    }

    @Test
    void hashRefreshToken_다른_입력에_다른_해시_반환() {
        assertThat(jwtProvider.hashRefreshToken("token-a"))
                .isNotEqualTo(jwtProvider.hashRefreshToken("token-b"));
    }

    @Test
    void generateConsentTicket_consent_claim을_가진_30분_JWT_생성() {
        Map<String, Object> claims = Map.of(
                "basicInfo", true,
                "sensitiveInfo", true,
                "caregiverShare", false,
                "marketing", false,
                "termsVersion", "1.0"
        );

        String ticket = jwtProvider.generateConsentTicket(claims);

        Claims parsed = jwtProvider.parseConsentTicket(ticket);
        assertThat(parsed.get("basicInfo", Boolean.class)).isTrue();
        assertThat(parsed.get("termsVersion", String.class)).isEqualTo("1.0");
    }

    @Test
    void parseConsentTicket_만료된_티켓은_예외_발생() {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        String expired = Jwts.builder()
                .subject("consent")
                .claim("basicInfo", true)
                .expiration(Date.from(Instant.now().minusSeconds(1)))
                .signWith(key)
                .compact();

        org.assertj.core.api.Assertions.assertThatThrownBy(
                () -> jwtProvider.parseConsentTicket(expired))
                .isInstanceOf(com.project.backend.common.exception.ApiException.class);
    }
}
