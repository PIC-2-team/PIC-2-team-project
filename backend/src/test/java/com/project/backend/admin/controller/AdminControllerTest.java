package com.project.backend.admin.controller;

import com.project.backend.admin.dto.*;
import com.project.backend.admin.service.AdminService;
import com.project.backend.common.response.ApiResponse;
import com.project.backend.common.response.PaginatedData;
import com.project.backend.record.entity.RecordCategory;
import com.project.backend.user.entity.UserRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

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
    @DisplayName("기관 정보 수정 API 호출 시 수정된 기관 정보를 반환한다")
    void updateOrganization_endpoint() {
        AdminService adminService = mock(AdminService.class);
        AdminController controller = new AdminController(adminService);

        UpdateAdminOrganizationRequest request = new UpdateAdminOrganizationRequest("새솔복지관");
        AdminOrganizationResponse mockResponse = new AdminOrganizationResponse(1L, "새솔복지관", "KNU001", null, null, LocalDateTime.now());
        given(adminService.updateOrganization(1L, request)).willReturn(mockResponse);

        ApiResponse<AdminOrganizationResponse> response = controller.updateOrganization(1L, request);

        assertThat(response.success()).isTrue();
        assertThat(response.data().name()).isEqualTo("새솔복지관");
    }

    @Test
    @DisplayName("기관 삭제 API 호출 시 정상 처리된다")
    void deleteOrganization_endpoint() {
        AdminService adminService = mock(AdminService.class);
        AdminController controller = new AdminController(adminService);

        ApiResponse<Void> response = controller.deleteOrganization(1L);

        assertThat(response.success()).isTrue();
        verify(adminService).deleteOrganization(1L);
    }

    @Test
    @DisplayName("신규 사용자 등록 API 호출 시 생성된 사용자 정보를 반환한다")
    void createUser_endpoint() {
        AdminService adminService = mock(AdminService.class);
        AdminController controller = new AdminController(adminService);

        CreateAdminUserRequest request = new CreateAdminUserRequest(
                "김새롬", "new@test.com", "Password123!", UserRole.SUPPORT_WORKER, "010-1111-2222", 1L
        );
        UserSummaryResponse mockUser = new UserSummaryResponse(
                10L, "김새롬", "new@test.com", "010-1111-2222", UserRole.SUPPORT_WORKER, "SW-100", 1L, "행복복지관", LocalDateTime.now()
        );
        given(adminService.createUser(request)).willReturn(mockUser);

        ApiResponse<UserSummaryResponse> response = controller.createUser(request);

        assertThat(response.success()).isTrue();
        assertThat(response.data().name()).isEqualTo("김새롬");
        assertThat(response.data().organizationName()).isEqualTo("행복복지관");
    }

    @Test
    @DisplayName("사용자 정보 수정 API 호출 시 수정된 사용자 정보를 반환한다")
    void updateUser_endpoint() {
        AdminService adminService = mock(AdminService.class);
        AdminController controller = new AdminController(adminService);

        UpdateAdminUserRequest request = new UpdateAdminUserRequest(
                "김새롬수정", "new@test.com", UserRole.SUPPORT_WORKER, "010-9999-8888", 1L
        );
        UserSummaryResponse mockUser = new UserSummaryResponse(
                10L, "김새롬수정", "new@test.com", "010-9999-8888", UserRole.SUPPORT_WORKER, "SW-100", 1L, "행복복지관", LocalDateTime.now()
        );
        given(adminService.updateUser(10L, request)).willReturn(mockUser);

        ApiResponse<UserSummaryResponse> response = controller.updateUser(10L, request);

        assertThat(response.success()).isTrue();
        assertThat(response.data().name()).isEqualTo("김새롬수정");
    }

    @Test
    @DisplayName("사용자 삭제 API 호출 시 정상 처리된다")
    void deleteUser_endpoint() {
        AdminService adminService = mock(AdminService.class);
        AdminController controller = new AdminController(adminService);

        ApiResponse<Void> response = controller.deleteUser(10L, 999L);

        assertThat(response.success()).isTrue();
        verify(adminService).deleteUser(10L, 999L);
    }

    @Test
    @DisplayName("특정 사용자의 생활기록 조회 API 호출 시 기록 목록을 반환한다")
    void getUserRecords_endpoint() {
        AdminService adminService = mock(AdminService.class);
        AdminController controller = new AdminController(adminService);

        AdminRecordSummaryResponse mockRecord = new AdminRecordSummaryResponse(
                1L, 100L, "이영희", 10L, "김새롬", "식사 보조 완료", RecordCategory.MEAL, Instant.now(), Instant.now()
        );
        given(adminService.getUserRecords(10L)).willReturn(List.of(mockRecord));

        ApiResponse<List<AdminRecordSummaryResponse>> response = controller.getUserRecords(10L);

        assertThat(response.success()).isTrue();
        assertThat(response.data()).hasSize(1);
        assertThat(response.data().get(0).content()).isEqualTo("식사 보조 완료");
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
