package com.project.backend.auth.controller;

import com.project.backend.auth.dto.*;
import com.project.backend.auth.service.AuthService;
import com.project.backend.auth.service.GoogleAuthService;
import com.project.backend.care.service.SecondaryGuardianService;
import com.project.backend.common.response.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AuthControllerTest {

    @Test
    void findEmail_성공시_마스킹된_이메일_반환() {
        AuthService authService = mock(AuthService.class);
        GoogleAuthService googleAuthService = mock(GoogleAuthService.class);
        SecondaryGuardianService secondaryGuardianService = mock(SecondaryGuardianService.class);
        FindEmailRequest req = new FindEmailRequest("홍길동", "01012345678");
        given(authService.findEmail(req)).willReturn(new FindEmailResponse("hon***@example.com"));

        AuthController controller = new AuthController(authService, googleAuthService, secondaryGuardianService);
        ApiResponse<FindEmailResponse> res = controller.findEmail(req);

        assertThat(res.data().email()).isEqualTo("hon***@example.com");
    }

    @Test
    void resetPassword_성공시_서비스_호출() {
        AuthService authService = mock(AuthService.class);
        GoogleAuthService googleAuthService = mock(GoogleAuthService.class);
        SecondaryGuardianService secondaryGuardianService = mock(SecondaryGuardianService.class);
        ResetPasswordRequest req = new ResetPasswordRequest("홍길동", "01012345678", "test@example.com", "newPw1234");

        AuthController controller = new AuthController(authService, googleAuthService, secondaryGuardianService);
        controller.resetPassword(req);

        verify(authService).resetPassword(req);
    }

    @Test
    void refreshCookieSupportsSecureCrossSiteRefreshRequests() {
        AuthService authService = mock(AuthService.class);
        GoogleAuthService googleAuthService = mock(GoogleAuthService.class);
        SecondaryGuardianService secondaryGuardianService = mock(SecondaryGuardianService.class);
        given(googleAuthService.authenticate("google-id-token"))
                .willReturn(new SessionResult<>(GoogleAuthResult.success("access-token", null), "refresh-token"));
        AuthController controller = new AuthController(authService, googleAuthService, secondaryGuardianService);
        ReflectionTestUtils.setField(controller, "refreshTokenExpiryDays", 30);
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.googleLogin(new GoogleAuthRequest("google-id-token"), response);

        assertThat(response.getHeader("Set-Cookie"))
                .contains("HttpOnly", "Secure", "SameSite=None", "Path=/api/auth");
    }
}
