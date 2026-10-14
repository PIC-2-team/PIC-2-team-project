package com.project.backend.common.security;

import com.project.backend.common.exception.ApiException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtProvider {

    private final SecretKey key;
    private final long accessTokenExpirySeconds;

    public JwtProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-expiry-seconds}") long accessTokenExpirySeconds) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirySeconds = accessTokenExpirySeconds;
    }

    public String generateAccessToken(Long userId, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(accessTokenExpirySeconds)))
                .signWith(key)
                .compact();
    }

    public Long extractUserId(String token) {
        return Long.parseLong(
            Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject()
        );
    }

    public String extractRole(String token) {
        return Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token)
                .getPayload()
                .get("role", String.class);
    }

    public boolean isValid(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String generateConsentTicket(Map<String, Object> consentClaims) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject("consent")
                .claims(consentClaims)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(30 * 60)))
                .signWith(key)
                .compact();
    }

    public Claims parseConsentTicket(String ticket) {
        try {
            return Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(ticket)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CONSENT_TICKET", "동의 티켓이 유효하지 않습니다.");
        }
    }

    /** 랜덤 refresh token 원문 생성 */
    public String generateRefreshTokenValue() {
        return UUID.randomUUID().toString();
    }

    /** refresh token 원문을 SHA-256 해시로 변환하여 DB에 저장 */
    public String hashRefreshToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
