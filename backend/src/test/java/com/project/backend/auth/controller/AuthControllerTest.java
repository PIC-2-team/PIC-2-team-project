package com.project.backend.auth.controller;

import com.project.backend.auth.dto.GoogleAuthRequest;
import com.project.backend.auth.dto.GoogleAuthResult;
import com.project.backend.auth.dto.SessionResult;
import com.project.backend.auth.service.AuthService;
import com.project.backend.auth.service.GoogleAuthService;
import com.project.backend.care.service.SecondaryGuardianService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class AuthControllerTest {

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
