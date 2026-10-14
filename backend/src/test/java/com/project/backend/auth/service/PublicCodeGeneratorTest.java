package com.project.backend.auth.service;

import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PublicCodeGeneratorTest {

    @Mock
    UserRepository userRepository;

    @InjectMocks
    PublicCodeGenerator publicCodeGenerator;

    @BeforeEach
    void setUp() {
        given(userRepository.existsByPublicCode(anyString())).willReturn(false);
    }

    @Test
    void GUARDIAN_역할은_P_dash_prefix_10자_코드_생성() {
        String code = publicCodeGenerator.generate(UserRole.GUARDIAN);

        assertThat(code).startsWith("P-");
        assertThat(code).hasSize(10);
    }

    @Test
    void SUPPORT_WORKER_역할은_S_dash_prefix_10자_코드_생성() {
        String code = publicCodeGenerator.generate(UserRole.SUPPORT_WORKER);

        assertThat(code).startsWith("S-");
        assertThat(code).hasSize(10);
    }

    @Test
    void INSTITUTION_역할은_I_dash_prefix_10자_코드_생성() {
        String code = publicCodeGenerator.generate(UserRole.INSTITUTION);

        assertThat(code).startsWith("I-");
        assertThat(code).hasSize(10);
    }

    @Test
    void 중복_코드_발생시_고유한_코드가_나올_때까지_재시도() {
        given(userRepository.existsByPublicCode(anyString()))
                .willReturn(true, true, false);

        String code = publicCodeGenerator.generate(UserRole.GUARDIAN);

        assertThat(code).startsWith("P-");
        verify(userRepository, times(3)).existsByPublicCode(anyString());
    }

    @Test
    void suffix_8자는_대문자_알파벳_또는_숫자만_포함() {
        String code = publicCodeGenerator.generate(UserRole.GUARDIAN);
        String suffix = code.substring(2);

        assertThat(suffix).matches("[A-Z0-9]{8}");
    }
}
