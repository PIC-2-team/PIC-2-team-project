package com.project.backend.admin.service;

import com.project.backend.admin.dto.AdminOrganizationResponse;
import com.project.backend.admin.dto.CreateAdminOrganizationRequest;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.organization.entity.Organization;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock UserRepository userRepository;
    @Mock CareRecipientRepository careRecipientRepository;
    @Mock OrganizationRepository organizationRepository;
    @Mock DailyRecordRepository dailyRecordRepository;

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
