package com.project.backend.admin.service;

import com.project.backend.admin.dto.AdminCareRecipientResponse;
import com.project.backend.admin.dto.AdminOrganizationResponse;
import com.project.backend.admin.dto.CreateAdminCareRecipientRequest;
import com.project.backend.admin.dto.CreateAdminOrganizationRequest;
import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientDisabilityRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.care.service.CareRecipientNumberGenerator;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationRecipientLink;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock UserRepository userRepository;
    @Mock CareRecipientRepository careRecipientRepository;
    @Mock CareRecipientDisabilityRepository disabilityRepository;
    @Mock CareGuardianRepository careGuardianRepository;
    @Mock OrganizationRecipientLinkRepository organizationRecipientLinkRepository;
    @Mock OrganizationRepository organizationRepository;
    @Mock DailyRecordRepository dailyRecordRepository;
    @Mock CareRecipientNumberGenerator numberGenerator;

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

    @Test
    @DisplayName("슈퍼 어드민이 당사자를 생성하면 고유 코드가 발급되고 보호자 정보는 null로 등록된다")
    void createCareRecipient_success() {
        given(numberGenerator.generate()).willReturn("R-TEST1234");
        given(careRecipientRepository.save(any(CareRecipient.class))).willAnswer(inv -> {
            CareRecipient r = inv.getArgument(0);
            ReflectionTestUtils.setField(r, "id", 200L);
            ReflectionTestUtils.setField(r, "createdAt", LocalDateTime.now());
            return r;
        });

        CreateAdminCareRecipientRequest request = new CreateAdminCareRecipientRequest(
                "김철수",
                LocalDate.of(2005, 5, 5),
                Gender.MALE,
                List.of(DisabilityType.AUTISM),
                1,
                null
        );

        AdminCareRecipientResponse response = adminService.createCareRecipient(request);

        assertThat(response.id()).isEqualTo(200L);
        assertThat(response.name()).isEqualTo("김철수");
        assertThat(response.careRecipientNumber()).isEqualTo("R-TEST1234");
        assertThat(response.gender()).isEqualTo(Gender.MALE);
        assertThat(response.disabilityTypes()).containsExactly(DisabilityType.AUTISM);
        assertThat(response.guardianName()).isNull();
        assertThat(response.guardianEmail()).isNull();
        assertThat(response.organizationName()).isNull();
        verify(disabilityRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("전체 당사자 목록 조회 시 보호자 정보 및 소속 기관 정보가 함께 매핑된다")
    void getCareRecipients_withMapping() {
        CareRecipient r1 = CareRecipient.builder()
                .careRecipientNumber("R-AAAA1111")
                .name("이영희")
                .birthDate(LocalDate.of(2010, 1, 1))
                .gender(Gender.FEMALE)
                .build();
        ReflectionTestUtils.setField(r1, "id", 101L);
        ReflectionTestUtils.setField(r1, "createdAt", LocalDateTime.now());

        CareRecipient r2 = CareRecipient.builder()
                .careRecipientNumber("R-BBBB2222")
                .name("박민수")
                .birthDate(LocalDate.of(2012, 2, 2))
                .gender(Gender.MALE)
                .build();
        ReflectionTestUtils.setField(r2, "id", 102L);
        ReflectionTestUtils.setField(r2, "createdAt", LocalDateTime.now());

        given(careRecipientRepository.findAllByOrderByCreatedAtDesc()).willReturn(List.of(r1, r2));

        // disabilities
        CareRecipientDisability d1 = CareRecipientDisability.builder()
                .careRecipientId(101L).disabilityType(DisabilityType.INTELLECTUAL).build();
        given(disabilityRepository.findByCareRecipientIdIn(List.of(101L, 102L))).willReturn(List.of(d1));

        // guardian mapping (r1만 보호자 있음)
        CareGuardian guardianLink = CareGuardian.builder()
                .careRecipientId(101L).guardianId(50L).type(GuardianType.PRIMARY).status(GuardianStatus.ACTIVE).build();
        given(careGuardianRepository.findByCareRecipientIdInAndTypeAndStatus(
                List.of(101L, 102L), GuardianType.PRIMARY, GuardianStatus.ACTIVE
        )).willReturn(List.of(guardianLink));

        User guardianUser = User.builder().email("guardian@test.com").name("보호자김").phone("010-0000-0000").role(UserRole.GUARDIAN).build();
        ReflectionTestUtils.setField(guardianUser, "id", 50L);
        given(userRepository.findAllById(List.of(50L))).willReturn(List.of(guardianUser));

        // organization mapping (r1만 기관 연결됨)
        OrganizationRecipientLink orgLink = OrganizationRecipientLink.builder()
                .organizationId(30L).careRecipientId(101L).requestedById(50L).build();
        ReflectionTestUtils.setField(orgLink, "status", LinkStatus.ACCEPTED);
        given(organizationRecipientLinkRepository.findByCareRecipientIdInAndStatus(
                List.of(101L, 102L), LinkStatus.ACCEPTED
        )).willReturn(List.of(orgLink));

        Organization org = Organization.builder().name("나눔복지관").organizationCode("ORG123").build();
        ReflectionTestUtils.setField(org, "id", 30L);
        given(organizationRepository.findAllById(List.of(30L))).willReturn(List.of(org));

        List<AdminCareRecipientResponse> result = adminService.getCareRecipients(null);

        assertThat(result).hasSize(2);
        AdminCareRecipientResponse first = result.get(0);
        assertThat(first.name()).isEqualTo("이영희");
        assertThat(first.guardianName()).isEqualTo("보호자김");
        assertThat(first.guardianEmail()).isEqualTo("guardian@test.com");
        assertThat(first.organizationName()).isEqualTo("나눔복지관");
        assertThat(first.disabilityTypes()).containsExactly(DisabilityType.INTELLECTUAL);

        AdminCareRecipientResponse second = result.get(1);
        assertThat(second.name()).isEqualTo("박민수");
        assertThat(second.guardianName()).isNull();
        assertThat(second.guardianEmail()).isNull();
        assertThat(second.organizationName()).isNull();
    }
}
