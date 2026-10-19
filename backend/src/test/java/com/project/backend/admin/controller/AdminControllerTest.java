package com.project.backend.admin.controller;

import com.project.backend.admin.dto.AdminOrganizationResponse;
import com.project.backend.admin.dto.CreateAdminOrganizationRequest;
import com.project.backend.admin.service.AdminService;
import com.project.backend.common.response.ApiResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class AdminControllerTest {

    @Test
    @DisplayName("슈퍼 어드민 기관 생성 API 호출 시 201 응답과 함께 생성된 기관 정보를 반환한다")
    void createOrganization_endpoint() {
        AdminService adminService = mock(AdminService.class);
        AdminController controller = new AdminController(adminService);

        CreateAdminOrganizationRequest request = new CreateAdminOrganizationRequest("행복복지관");
        AdminOrganizationResponse mockResponse = new AdminOrganizationResponse(1L, "행복복지관", "KNU001", null, null, LocalDateTime.now());
        given(adminService.createOrganization(request)).willReturn(mockResponse);

        ApiResponse<AdminOrganizationResponse> response = controller.createOrganization(request);

        assertThat(response.success()).isTrue();
        assertThat(response.data().organizationCode()).isEqualTo("KNU001");
        assertThat(response.data().name()).isEqualTo("행복복지관");
    }

    @Test
    @DisplayName("기관 목록 조회 API 호출 시 기관 목록을 반환한다")
    void getOrganizations_endpoint() {
        AdminService adminService = mock(AdminService.class);
        AdminController controller = new AdminController(adminService);

        AdminOrganizationResponse item = new AdminOrganizationResponse(1L, "행복복지관", "KNU001", 10L, "홍길동", LocalDateTime.now());
        given(adminService.getOrganizations()).willReturn(List.of(item));

        ApiResponse<List<AdminOrganizationResponse>> response = controller.getOrganizations();

        assertThat(response.success()).isTrue();
        assertThat(response.data()).hasSize(1);
        assertThat(response.data().get(0).ownerName()).isEqualTo("홍길동");
    }
}
