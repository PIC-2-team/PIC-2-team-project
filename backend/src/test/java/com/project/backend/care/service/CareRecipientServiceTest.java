package com.project.backend.care.service;

import com.project.backend.care.dto.CareRecipientResponse;
import com.project.backend.care.dto.CreateCareRecipientRequest;
import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareAssignmentRepository;
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
    @Mock CareAssignmentRepository careAssignmentRepository;
    @Mock CareRecipientNumberGenerator numberGenerator;
    @Mock CareAccessService careAccessService;
    @Mock UserRepository userRepository;
    @Mock com.project.backend.organization.repository.OrganizationRecipientLinkRepository organizationRecipientLinkRepository;
    @Mock com.project.backend.organization.repository.OrganizationRepository organizationRepository;

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
    void getAll_GUARDIAN_역할이면_활성_보호자_관계의_당사자_목록_반환() {
        User guardian = guardianUser(1L);
        given(userRepository.findById(1L)).willReturn(Optional.of(guardian));

        CareGuardian cg = CareGuardian.builder()
                .careRecipientId(100L).guardianId(1L)
                .type(GuardianType.PRIMARY).status(GuardianStatus.ACTIVE).build();
        given(careGuardianRepository.findByGuardianIdAndStatus(1L, GuardianStatus.ACTIVE))
                .willReturn(List.of(cg));

        CareRecipient r = CareRecipient.builder()
                .careRecipientNumber("R-TEST0001").name("김삶결")
                .birthDate(LocalDate.of(2000, 1, 1)).gender(Gender.MALE).build();
        ReflectionTestUtils.setField(r, "id", 100L);
        given(careRecipientRepository.findAllById(List.of(100L))).willReturn(List.of(r));
        given(disabilityRepository.findByCareRecipientIdIn(List.of(100L))).willReturn(List.of());

        List<CareRecipientResponse> result = careRecipientService.getAll(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("김삶결");
    }

    @Test
    void getAll_SUPPORT_WORKER_역할이면_현재_배정된_당사자_목록_반환() {
        User worker = supportWorkerUser(2L);
        given(userRepository.findById(2L)).willReturn(Optional.of(worker));

        CareAssignment assignment = CareAssignment.builder()
                .organizationId(10L).careRecipientId(200L).supportWorkerId(2L)
                .idempotencyKey("key1").startDate(LocalDate.now()).build();
        given(careAssignmentRepository.findBySupportWorkerIdAndEndedAtIsNull(2L))
                .willReturn(List.of(assignment));

        CareRecipient r = CareRecipient.builder()
                .careRecipientNumber("R-TEST0002").name("박삶결")
                .birthDate(LocalDate.of(1999, 5, 5)).gender(Gender.FEMALE).build();
        ReflectionTestUtils.setField(r, "id", 200L);
        given(careRecipientRepository.findAllById(List.of(200L))).willReturn(List.of(r));
        given(disabilityRepository.findByCareRecipientIdIn(List.of(200L))).willReturn(List.of());

        List<CareRecipientResponse> result = careRecipientService.getAll(2L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("박삶결");
    }

    @Test
    void getById_접근권한_없는_사용자는_FORBIDDEN_예외() {
        org.mockito.Mockito.doThrow(new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다."))
                .when(careAccessService).verifyAccess(99L, 100L);

        assertThatThrownBy(() -> careRecipientService.getById(99L, 100L))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void getRelations_접근권한_검증_후_기관_및_배정_정보_반환() {
        Long userId = 1L;
        Long recipientId = 100L;

        com.project.backend.organization.entity.Organization org = com.project.backend.organization.entity.Organization.builder()
                .name("행복복지관").organizationCode("KNU001").ownerId(10L).build();
        ReflectionTestUtils.setField(org, "id", 10L);

        com.project.backend.organization.entity.OrganizationRecipientLink link = com.project.backend.organization.entity.OrganizationRecipientLink.builder()
                .organizationId(10L).careRecipientId(recipientId).requestedById(userId).build();
        ReflectionTestUtils.setField(link, "id", 1L);

        CareAssignment assignment = CareAssignment.builder()
                .organizationId(10L).careRecipientId(recipientId).supportWorkerId(2L)
                .idempotencyKey("k1").startDate(LocalDate.of(2026, 1, 1)).build();
        ReflectionTestUtils.setField(assignment, "id", 50L);

        User worker = supportWorkerUser(2L);

        given(organizationRecipientLinkRepository.findByCareRecipientId(recipientId)).willReturn(List.of(link));
        given(organizationRepository.findAllById(List.of(10L))).willReturn(List.of(org));
        given(careAssignmentRepository.findByCareRecipientIdAndEndedAtIsNull(recipientId)).willReturn(List.of(assignment));
        given(userRepository.findAllById(List.of(2L))).willReturn(List.of(worker));

        com.project.backend.care.dto.CareRelationsResponse response = careRecipientService.getRelations(userId, recipientId);

        assertThat(response.careRecipientId()).isEqualTo(recipientId);
        assertThat(response.organizations()).hasSize(1);
        assertThat(response.organizations().get(0).organizationName()).isEqualTo("행복복지관");
        assertThat(response.assignments()).hasSize(1);
        assertThat(response.assignments().get(0).supportWorkerName()).isEqualTo("지원사");
        verify(careAccessService).verifyAccess(userId, recipientId);
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
