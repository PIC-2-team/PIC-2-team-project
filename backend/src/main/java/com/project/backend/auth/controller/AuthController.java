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
        AuthResponse result = authService.register(request);
        // refresh token은 쿠키로 내려줘야 하나, 현재 AuthService는 raw token을 반환하지 않음.
        // Phase 1에서는 accessToken만 반환. 쿠키 기반 refresh는 Phase 1.5 리팩토링 예정.
        return ApiResponse.ok(result);
    }

    @Operation(summary = "이메일 로그인")
    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @Operation(summary = "Access Token 갱신")
    @PostMapping("/refresh")
    public ApiResponse<RefreshResponse> refresh(HttpServletRequest request) {
        String rawToken = extractRefreshTokenCookie(request);
        return ApiResponse.ok(authService.refresh(rawToken));
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
    public ApiResponse<GoogleAuthResult> googleLogin(@Valid @RequestBody GoogleAuthRequest request) {
        return ApiResponse.ok(googleAuthService.authenticate(request.idToken()));
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

    private void expireRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, "");
        cookie.setMaxAge(0);
        cookie.setHttpOnly(true);
        cookie.setPath("/api/auth");
        response.addCookie(cookie);
    }
}
