package com.project.backend.common.config;

import com.project.backend.common.security.JwtAuthFilter;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class SecurityConfigTest {

    @Test
    void allowsOnlyConfiguredPreviewOriginPattern() {
        SecurityConfig config = new SecurityConfig(mock(JwtAuthFilter.class));
        ReflectionTestUtils.setField(config, "allowedOrigins", "https://pic-2-team-frontend-prod.vercel.app");
        ReflectionTestUtils.setField(config, "allowedOriginPatterns",
                "https://pic-2-team-frontend-prod-*.vercel.app");

        CorsConfiguration cors = config.corsConfigurationSource()
                .getCorsConfiguration(new MockHttpServletRequest());

        assertThat(cors.checkOrigin("https://pic-2-team-frontend-prod-9838flxv5-eunhyes-projects-0b70d4c2.vercel.app"))
                .isEqualTo("https://pic-2-team-frontend-prod-9838flxv5-eunhyes-projects-0b70d4c2.vercel.app");
        assertThat(cors.checkOrigin("https://untrusted.vercel.app")).isNull();
    }
}
