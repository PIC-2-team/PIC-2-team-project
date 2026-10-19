package com.project.backend.organization.controller;

import com.project.backend.common.response.ApiResponse;
import com.project.backend.organization.dto.OrganizationResponse;
import com.project.backend.organization.dto.RegisterOrganizationRequest;
import com.project.backend.organization.service.CareAssignmentService;
import com.project.backend.organization.service.OrganizationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class OrganizationControllerTest {

    @Test
    @DisplayName("기관 담당자 6자리 코드 등록 API 호출 시 201 응답과 함께 등록된 기관 정보를 반환한다")
    void register_endpoint() {
        OrganizationService organizationService = mock(OrganizationService.class);
        CareAssignmentService careAssignmentService = mock(CareAssignmentService.class);
        OrganizationController controller = new OrganizationController(organizationService, careAssignmentService);

        RegisterOrganizationRequest request = new RegisterOrganizationRequest("KNU001");
        OrganizationResponse mockResponse = new OrganizationResponse(1L, "행복복지관", "KNU001", LocalDateTime.now());
        given(organizationService.register(10L, request)).willReturn(mockResponse);

        ApiResponse<OrganizationResponse> response = controller.register(10L, request);

        assertThat(response.success()).isTrue();
        assertThat(response.data().organizationCode()).isEqualTo("KNU001");
        assertThat(response.data().name()).isEqualTo("행복복지관");
    }
}
