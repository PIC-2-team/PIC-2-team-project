package com.project.backend.auth.controller;

import com.project.backend.auth.dto.*;
import com.project.backend.auth.service.AuthService;
import com.project.backend.auth.service.GoogleAuthService;
import com.project.backend.care.service.SecondaryGuardianService;
import com.project.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@Tag(name = "Auth")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    private final AuthService authService;
    private final GoogleAuthService googleAuthService;
    private final SecondaryGuardianService secondaryGuardianService;

    @Value("${jwt.refresh-token-expiry-days:30}")
    private int refreshTokenExpiryDays;

    @Operation(summary = "동의 티켓 발급")
    @PostMapping("/consent")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<ConsentResponse> consent(@Valid @RequestBody ConsentRequest request) {
        return ApiResponse.ok(authService.issueConsentTicket(request));
    }

    @Operation(summary = "이메일 회원가입")
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                               HttpServletResponse response) {
        SessionResult<AuthResponse> session = authService.register(request);
        setRefreshCookie(response, session.rawRefreshToken());
        return ApiResponse.ok(session.data());
    }

    @Operation(summary = "이메일 로그인")
    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                            HttpServletResponse response) {
        SessionResult<AuthResponse> session = authService.login(request);
        setRefreshCookie(response, session.rawRefreshToken());
        return ApiResponse.ok(session.data());
    }

    @Operation(summary = "Access Token 갱신")
    @PostMapping("/refresh")
    public ApiResponse<RefreshResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        String rawToken = extractRefreshTokenCookie(request);
        SessionResult<RefreshResponse> session = authService.refresh(rawToken);
        setRefreshCookie(response, session.rawRefreshToken());
        return ApiResponse.ok(session.data());
    }

    @Operation(summary = "로그아웃")
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String rawToken = extractRefreshTokenCookie(request);
        authService.logout(rawToken);
        expireRefreshTokenCookie(response);
    }

    @Operation(summary = "Google 소셜 로그인")
    @PostMapping("/google")
    public ApiResponse<GoogleAuthResult> googleLogin(@Valid @RequestBody GoogleAuthRequest request,
                                                      HttpServletResponse response) {
        SessionResult<GoogleAuthResult> session = googleAuthService.authenticate(request.idToken());
        if (session.rawRefreshToken() != null) {
            setRefreshCookie(response, session.rawRefreshToken());
        }
        return ApiResponse.ok(session.data());
    }

    @Operation(summary = "Google 신규 회원가입")
    @PostMapping("/google/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<GoogleAuthResult> googleRegister(@Valid @RequestBody GoogleRegisterRequest request,
                                                         HttpServletResponse response) {
        SessionResult<GoogleAuthResult> session = googleAuthService.register(request);
        setRefreshCookie(response, session.rawRefreshToken());
        return ApiResponse.ok(session.data());
    }

    @Operation(summary = "세컨드 보호자 초대 수락")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/invitations/accept")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void acceptInvitation(@AuthenticationPrincipal Long userId,
                                 @Valid @RequestBody AcceptInvitationRequest request) {
        secondaryGuardianService.acceptInvitation(userId, request.invitationToken());
    }

    private String extractRefreshTokenCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            throw new com.project.backend.common.exception.ApiException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "MISSING_REFRESH_TOKEN", "refresh token이 없습니다.");
        }
        return Arrays.stream(request.getCookies())
                .filter(c -> REFRESH_TOKEN_COOKIE.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElseThrow(() -> new com.project.backend.common.exception.ApiException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED,
                        "MISSING_REFRESH_TOKEN", "refresh token이 없습니다."));
    }

    private void setRefreshCookie(HttpServletResponse response, String raw) {
        Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, raw);
        cookie.setMaxAge(refreshTokenExpiryDays * 24 * 60 * 60);
        cookie.setHttpOnly(true);
        cookie.setPath("/api/auth");
        response.addCookie(cookie);
    }

    private void expireRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, "");
        cookie.setMaxAge(0);
        cookie.setHttpOnly(true);
        cookie.setPath("/api/auth");
        response.addCookie(cookie);
    }
}
