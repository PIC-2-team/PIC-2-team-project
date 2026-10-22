package com.project.backend.organization.controller;

import com.project.backend.care.dto.CareRecipientResponse;
import com.project.backend.care.dto.CreateCareRecipientRequest;
import com.project.backend.care.dto.UpdateCareRecipientRequest;
import com.project.backend.care.entity.DisabilityType;
import com.project.backend.care.entity.Gender;
import com.project.backend.care.service.CareRecipientService;
import com.project.backend.common.response.ApiResponse;
import com.project.backend.organization.dto.*;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import com.project.backend.organization.service.CareAssignmentService;
import com.project.backend.organization.service.OrganizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class OrganizationControllerTest {

    private OrganizationService organizationService;
    private CareAssignmentService careAssignmentService;
    private CareRecipientService careRecipientService;
    private OrganizationController controller;

    @BeforeEach
    void setUp() {
        organizationService = mock(OrganizationService.class);
        careAssignmentService = mock(CareAssignmentService.class);
        careRecipientService = mock(CareRecipientService.class);
        controller = new OrganizationController(organizationService, careAssignmentService, careRecipientService);
    }

    @Test
    @DisplayName("기관 담당자 6자리 코드 등록 API 호출 시 201 응답과 함께 등록된 기관 정보를 반환한다")
    void register_endpoint() {
        RegisterOrganizationRequest request = new RegisterOrganizationRequest("KNU001");
        OrganizationResponse mockResponse = new OrganizationResponse(1L, "행복복지관", "KNU001", LocalDateTime.now());
        given(organizationService.register(10L, request)).willReturn(mockResponse);

        ApiResponse<OrganizationResponse> response = controller.register(10L, request);

        assertThat(response.success()).isTrue();
        assertThat(response.data().organizationCode()).isEqualTo("KNU001");
        assertThat(response.data().name()).isEqualTo("행복복지관");
    }

    @Test
    @DisplayName("기관 배정 종료 API 호출 시 해당 기관의 배정을 종료하고 200 OK를 반환한다")
    void endAssignment_endpoint() {
        OrganizationResponse mockOrg = new OrganizationResponse(1L, "행복복지관", "KNU001", LocalDateTime.now());
        given(organizationService.getMyOrganization(10L)).willReturn(mockOrg);

        ApiResponse<Void> response = controller.endAssignment(10L, 50L);

        assertThat(response.success()).isTrue();
        verify(careAssignmentService).endAssignment(1L, 50L);
    }

    @Test
    @DisplayName("기관 소속 돌봄 대상자 목록 조회 API 호출 시 대상자 목록을 반환한다")
    void getRecipients_endpoint() {
        CareRecipientResponse mockRecipient = new CareRecipientResponse(
                100L, "P-0001", "김철수", LocalDate.of(2000, 1, 1), Gender.MALE,
                List.of(DisabilityType.AUTISM), 1, null, null, LocalDateTime.now());
        given(careRecipientService.getOrganizationRecipients(10L)).willReturn(List.of(mockRecipient));

        ApiResponse<List<CareRecipientResponse>> response = controller.getRecipients(10L);

        assertThat(response.success()).isTrue();
        assertThat(response.data()).hasSize(1);
        assertThat(response.data().get(0).name()).isEqualTo("김철수");
    }

    @Test
    @DisplayName("기관 돌봄 대상자 등록 API 호출 시 대상자를 생성하고 반환한다")
    void registerRecipient_endpoint() {
        CreateCareRecipientRequest request = new CreateCareRecipientRequest(
                "김철수", LocalDate.of(2000, 1, 1), Gender.MALE, List.of(DisabilityType.AUTISM), 1, null);
        CareRecipientResponse mockRecipient = new CareRecipientResponse(
                100L, "P-0001", "김철수", LocalDate.of(2000, 1, 1), Gender.MALE,
                List.of(DisabilityType.AUTISM), 1, null, null, LocalDateTime.now());
        given(careRecipientService.registerByOrganization(10L, request)).willReturn(mockRecipient);

        ApiResponse<CareRecipientResponse> response = controller.registerRecipient(10L, request);

        assertThat(response.success()).isTrue();
        assertThat(response.data().id()).isEqualTo(100L);
    }

    @Test
    @DisplayName("기관 돌봄 대상자 정보 수정 API 호출 시 수정된 정보를 반환한다")
    void updateRecipient_endpoint() {
        UpdateCareRecipientRequest request = new UpdateCareRecipientRequest(
                "김철수_수정", null, null, null, null, null);
        CareRecipientResponse mockRecipient = new CareRecipientResponse(
                100L, "P-0001", "김철수_수정", LocalDate.of(2000, 1, 1), Gender.MALE,
                List.of(DisabilityType.AUTISM), 1, null, null, LocalDateTime.now());
        given(careRecipientService.updateByOrganization(10L, 100L, request)).willReturn(mockRecipient);

        ApiResponse<CareRecipientResponse> response = controller.updateRecipient(10L, 100L, request);

        assertThat(response.success()).isTrue();
        assertThat(response.data().name()).isEqualTo("김철수_수정");
    }

    @Test
    @DisplayName("기관 돌봄 대상자 삭제 API 호출 시 정상 처리된다")
    void deleteRecipient_endpoint() {
        ApiResponse<Void> response = controller.deleteRecipient(10L, 100L);

        assertThat(response.success()).isTrue();
        verify(careRecipientService).deleteByOrganization(10L, 100L);
    }

    @Test
    @DisplayName("돌봄지원사 추가 API 호출 시 지원사를 멤버로 추가하고 반환한다")
    void addMember_endpoint() {
        AddMemberRequest request = new AddMemberRequest(20L, null, null);
        MemberResponse mockMember = new MemberResponse(
                5L, 20L, "이지원", "SW-001", OrganizationMemberStatus.ACTIVE, LocalDateTime.now());
        given(organizationService.addMember(10L, request)).willReturn(mockMember);

        ApiResponse<MemberResponse> response = controller.addMember(10L, request);

        assertThat(response.success()).isTrue();
        assertThat(response.data().name()).isEqualTo("이지원");
    }

    @Test
    @DisplayName("돌봄지원사 삭제 API 호출 시 정상 처리된다")
    void removeMember_endpoint() {
        ApiResponse<Void> response = controller.removeMember(10L, 5L);

        assertThat(response.success()).isTrue();
        verify(organizationService).removeMember(10L, 5L);
    }

    @Test
    @DisplayName("기관 소속 돌봄 보호자 목록 조회 API 호출 시 보호자 목록을 반환한다")
    void getGuardians_endpoint() {
        OrganizationGuardianResponse mockGuardian = new OrganizationGuardianResponse(
                1L, 20L, "박보호", "010-1234-5678", "guardian@test.com", "P-12345", LocalDateTime.now(), List.of()
        );
        given(organizationService.getGuardians(10L)).willReturn(List.of(mockGuardian));

        ApiResponse<List<OrganizationGuardianResponse>> response = controller.getGuardians(10L);

        assertThat(response.success()).isTrue();
        assertThat(response.data()).hasSize(1);
        assertThat(response.data().get(0).name()).isEqualTo("박보호");
    }

    @Test
    @DisplayName("기관 돌봄 보호자 등록 API 호출 시 보호자를 등록하고 반환한다")
    void registerGuardian_endpoint() {
        RegisterGuardianRequest request = new RegisterGuardianRequest("010-1234-5678");
        OrganizationGuardianResponse mockGuardian = new OrganizationGuardianResponse(
                1L, 20L, "박보호", "010-1234-5678", "guardian@test.com", "P-12345", LocalDateTime.now(), List.of()
        );
        given(organizationService.registerGuardian(10L, request)).willReturn(mockGuardian);

        ApiResponse<OrganizationGuardianResponse> response = controller.registerGuardian(10L, request);

        assertThat(response.success()).isTrue();
        assertThat(response.data().publicCode()).isEqualTo("P-12345");
    }

    @Test
    @DisplayName("기관 돌봄 보호자 연결 해제 API 호출 시 정상 처리된다")
    void removeGuardian_endpoint() {
        ApiResponse<Void> response = controller.removeGuardian(10L, 20L);

        assertThat(response.success()).isTrue();
        verify(organizationService).removeGuardian(10L, 20L);
    }
}
