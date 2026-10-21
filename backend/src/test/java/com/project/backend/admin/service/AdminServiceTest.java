package com.project.backend.admin.service;

import com.project.backend.admin.dto.*;
import com.project.backend.auth.repository.ConsentRepository;
import com.project.backend.auth.service.PublicCodeGenerator;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.record.repository.DailyRecordRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock UserRepository userRepository;
    @Mock CareRecipientRepository careRecipientRepository;
    @Mock OrganizationRepository organizationRepository;
    @Mock OrganizationMemberRepository organizationMemberRepository;
    @Mock OrganizationRecipientLinkRepository organizationRecipientLinkRepository;
    @Mock DailyRecordRepository dailyRecordRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock ConsentRepository consentRepository;
    @Mock PublicCodeGenerator publicCodeGenerator;

    @InjectMocks AdminService adminService;

    @Test
    @DisplayName("슈퍼 어드민이 기관을 생성하면 6자리 영숫자 코드가 발급되고 ownerId는 null이다")
    void createOrganization_success() {
        given(organizationRepository.existsByOrganizationCode(anyString())).willReturn(false);
        given(organizationRepository.save(any(Organization.class))).willAnswer(inv -> {
            Organization org = inv.getArgument(0);
            ReflectionTestUtils.setField(org, "id", 100L);
            ReflectionTestUtils.setField(org, "createdAt", LocalDateTime.now());
            return org;
        });

        AdminOrganizationResponse response = adminService.createOrganization(new CreateAdminOrganizationRequest("행복복지관"));

        assertThat(response.id()).isEqualTo(100L);
        assertThat(response.name()).isEqualTo("행복복지관");
        assertThat(response.organizationCode()).matches("^[A-Z0-9]{6}$");
        assertThat(response.ownerId()).isNull();
        assertThat(response.ownerName()).isNull();
    }

    @Test
    @DisplayName("기관 이름을 수정할 수 있다")
    void updateOrganization_success() {
        Organization org = Organization.builder().name("구이름").organizationCode("ABC123").build();
        ReflectionTestUtils.setField(org, "id", 1L);
        ReflectionTestUtils.setField(org, "createdAt", LocalDateTime.now());
        given(organizationRepository.findById(1L)).willReturn(Optional.of(org));

        AdminOrganizationResponse response = adminService.updateOrganization(1L, new UpdateAdminOrganizationRequest("새이름"));

        assertThat(response.name()).isEqualTo("새이름");
        assertThat(org.getName()).isEqualTo("새이름");
    }

    @Test
    @DisplayName("기관을 삭제할 때 소속 멤버와 링크도 함께 삭제된다")
    void deleteOrganization_success() {
        Organization org = Organization.builder().name("삭제대상").organizationCode("DEL001").build();
        ReflectionTestUtils.setField(org, "id", 5L);
        given(organizationRepository.findById(5L)).willReturn(Optional.of(org));
        given(organizationMemberRepository.findByOrganizationId(5L)).willReturn(Collections.emptyList());
        given(organizationRecipientLinkRepository.findByOrganizationId(5L)).willReturn(Collections.emptyList());

        adminService.deleteOrganization(5L);

        verify(organizationRepository).delete(org);
    }

    @Test
    @DisplayName("슈퍼 어드민이 신규 사용자를 생성할 수 있다")
    void createUser_success() {
        CreateAdminUserRequest request = new CreateAdminUserRequest(
                "테스트사용자", "user@test.com", "Password123!", UserRole.SUPPORT_WORKER, "010-1234-5678", null
        );
        given(userRepository.existsByEmail("user@test.com")).willReturn(false);
        given(passwordEncoder.encode(anyString())).willReturn("encoded-password");
        given(publicCodeGenerator.generate(UserRole.SUPPORT_WORKER)).willReturn("SW-1234");
        given(userRepository.save(any(User.class))).willAnswer(inv -> {
            User u = inv.getArgument(0);
            ReflectionTestUtils.setField(u, "id", 50L);
            ReflectionTestUtils.setField(u, "createdAt", LocalDateTime.now());
            return u;
        });

        UserSummaryResponse response = adminService.createUser(request);

        assertThat(response.id()).isEqualTo(50L);
        assertThat(response.name()).isEqualTo("테스트사용자");
        assertThat(response.email()).isEqualTo("user@test.com");
        assertThat(response.role()).isEqualTo(UserRole.SUPPORT_WORKER);
    }

    @Test
    @DisplayName("전체 기관 목록을 조회할 때 소유자 정보가 함께 매핑된다")
    void getOrganizations_withOwnerMapping() {
        Organization org1 = Organization.builder().name("기관1").organizationCode("ABC123").ownerId(10L).build();
        ReflectionTestUtils.setField(org1, "id", 1L);
        ReflectionTestUtils.setField(org1, "createdAt", LocalDateTime.now());

        Organization org2 = Organization.builder().name("기관2").organizationCode("XYZ789").ownerId(null).build();
        ReflectionTestUtils.setField(org2, "id", 2L);
        ReflectionTestUtils.setField(org2, "createdAt", LocalDateTime.now());

        given(organizationRepository.findAllByOrderByCreatedAtDesc()).willReturn(List.of(org1, org2));

        User owner = User.builder().email("inst@test.com").name("홍길동").phone("010-1234-5678").role(UserRole.INSTITUTION).build();
        ReflectionTestUtils.setField(owner, "id", 10L);
        given(userRepository.findAllById(List.of(10L))).willReturn(List.of(owner));

        List<AdminOrganizationResponse> list = adminService.getOrganizations();

        assertThat(list).hasSize(2);
        assertThat(list.get(0).name()).isEqualTo("기관1");
        assertThat(list.get(0).ownerName()).isEqualTo("홍길동");
        assertThat(list.get(1).name()).isEqualTo("기관2");
        assertThat(list.get(1).ownerName()).isNull();
    }
}
