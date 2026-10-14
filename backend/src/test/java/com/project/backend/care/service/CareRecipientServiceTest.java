package com.project.backend.care.service;

import com.project.backend.care.dto.CareRecipientResponse;
import com.project.backend.care.dto.CreateCareRecipientRequest;
import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientDisabilityRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CareRecipientServiceTest {

    @Mock CareRecipientRepository careRecipientRepository;
    @Mock CareRecipientDisabilityRepository disabilityRepository;
    @Mock CareGuardianRepository careGuardianRepository;
    @Mock CareRecipientNumberGenerator numberGenerator;
    @Mock CareAccessService careAccessService;
    @Mock UserRepository userRepository;

    @InjectMocks CareRecipientService careRecipientService;

    @Test
    void register_GUARDIAN_사용자가_당사자_등록시_CareRecipient와_PRIMARY_CareGuardian_저장() {
        User guardian = guardianUser(1L);
        given(userRepository.findById(1L)).willReturn(Optional.of(guardian));
        given(numberGenerator.generate()).willReturn("R-ABCD1234");
        given(careRecipientRepository.save(any())).willAnswer(inv -> {
            CareRecipient r = inv.getArgument(0);
            ReflectionTestUtils.setField(r, "id", 100L);
            return r;
        });
        given(careGuardianRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(disabilityRepository.saveAll(any())).willReturn(List.of());

        CreateCareRecipientRequest req = new CreateCareRecipientRequest(
                "김삶결", LocalDate.of(2000, 1, 1), Gender.MALE,
                List.of(DisabilityType.INTELLECTUAL), 1, null
        );

        CareRecipientResponse response = careRecipientService.register(1L, req);

        assertThat(response.careRecipientNumber()).isEqualTo("R-ABCD1234");
        assertThat(response.name()).isEqualTo("김삶결");
        verify(careRecipientRepository).save(any(CareRecipient.class));
        verify(careGuardianRepository).save(any(CareGuardian.class));
    }

    @Test
    void register_GUARDIAN_역할이_아닌_사용자는_FORBIDDEN_예외() {
        User supportWorker = supportWorkerUser(2L);
        given(userRepository.findById(2L)).willReturn(Optional.of(supportWorker));

        CreateCareRecipientRequest req = new CreateCareRecipientRequest(
                "김삶결", LocalDate.of(2000, 1, 1), Gender.MALE,
                List.of(DisabilityType.AUTISM), null, null
        );

        assertThatThrownBy(() -> careRecipientService.register(2L, req))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void getById_접근권한_없는_사용자는_FORBIDDEN_예외() {
        org.mockito.Mockito.doThrow(new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다."))
                .when(careAccessService).verifyAccess(99L, 100L);

        assertThatThrownBy(() -> careRecipientService.getById(99L, 100L))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.FORBIDDEN);
    }

    private User guardianUser(Long id) {
        User u = User.builder().name("보호자").email("g@test.com").publicCode("P-X")
                .role(UserRole.GUARDIAN).build();
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    private User supportWorkerUser(Long id) {
        User u = User.builder().name("지원사").email("s@test.com").publicCode("S-X")
                .role(UserRole.SUPPORT_WORKER).build();
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }
}
