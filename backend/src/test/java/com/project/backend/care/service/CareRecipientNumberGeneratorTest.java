package com.project.backend.care.service;

import com.project.backend.care.repository.CareRecipientRepository;
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
class CareRecipientNumberGeneratorTest {

    @Mock CareRecipientRepository careRecipientRepository;
    @InjectMocks CareRecipientNumberGenerator generator;

    @Test
    void R_prefix_10자_번호_생성() {
        given(careRecipientRepository.existsByCareRecipientNumber(anyString())).willReturn(false);

        String number = generator.generate();

        assertThat(number).startsWith("R-");
        assertThat(number).hasSize(10);
    }

    @Test
    void suffix_8자는_대문자_알파벳_또는_숫자만_포함() {
        given(careRecipientRepository.existsByCareRecipientNumber(anyString())).willReturn(false);

        String suffix = generator.generate().substring(2);

        assertThat(suffix).matches("[A-Z0-9]{8}");
    }

    @Test
    void 중복_발생시_고유한_번호가_나올_때까지_재시도() {
        given(careRecipientRepository.existsByCareRecipientNumber(anyString()))
                .willReturn(true, true, false);

        generator.generate();

        verify(careRecipientRepository, times(3)).existsByCareRecipientNumber(anyString());
    }
}
