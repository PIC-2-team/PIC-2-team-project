package com.project.backend.user;

import com.project.backend.auth.entity.RefreshToken;
import com.project.backend.auth.repository.RefreshTokenRepository;
import com.project.backend.common.security.JwtProvider;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
class UserWithdrawalApiTest {
    @Autowired WebApplicationContext context;
    @Autowired JwtProvider jwt;
    @Autowired UserRepository users;
    @Autowired RefreshTokenRepository refreshTokens;
    MockMvc mvc;
    User user;
    String token;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        user = users.save(User.builder().name("홍길동").email("hong@test.invalid").password("encoded")
                .phone("010-1234-5678").googleId("google-1").publicCode("P-HONG").role(UserRole.GUARDIAN).build());
        token = jwt.generateAccessToken(user.getId(), "GUARDIAN");
    }

    @Test
    void withdrawAnonymizesTheAccount() throws Exception {
        mvc.perform(delete("/api/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        User saved = users.findById(user.getId()).orElseThrow();
        assertThat(saved.getName()).isEqualTo("탈퇴한 사용자");
        assertThat(saved.getEmail()).isEqualTo("deleted-" + user.getId() + "@deleted.invalid");
        assertThat(saved.getPhone()).isNull();
        assertThat(saved.getPassword()).isNull();
        assertThat(saved.getGoogleId()).isNull();
        assertThat(saved.getPublicCode()).isEqualTo("P-HONG");
        assertThat(saved.getDeletedAt()).isNotNull();
        assertThat(users.existsByEmail("hong@test.invalid")).isFalse();
        assertThat(users.findByGoogleId("google-1")).isEmpty();
    }

    @Test
    void withdrawRemovesRefreshTokens() throws Exception {
        refreshTokens.save(RefreshToken.builder().userId(user.getId()).tokenHash("hash-1").expiryDays(30).build());

        mvc.perform(delete("/api/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        assertThat(refreshTokens.findByTokenHash("hash-1")).isEmpty();
    }

    @Test
    void alreadyIssuedAccessTokenIsRejectedImmediatelyAfterWithdrawal() throws Exception {
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mvc.perform(delete("/api/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenOfNonexistentUserIsRejected() throws Exception {
        String ghost = jwt.generateAccessToken(999_999L, "GUARDIAN");

        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + ghost))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void withdrawRequiresLogin() throws Exception {
        mvc.perform(delete("/api/users/me")).andExpect(status().isUnauthorized());
    }
}
