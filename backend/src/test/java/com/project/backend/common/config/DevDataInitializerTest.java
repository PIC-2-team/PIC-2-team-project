package com.project.backend.common.config;

import com.project.backend.auth.entity.Consent;
import com.project.backend.auth.repository.ConsentRepository;
import com.project.backend.auth.service.PublicCodeGenerator;
import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationMember;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import com.project.backend.organization.entity.OrganizationRecipientLink;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DevDataInitializerTest {

    @Mock UserRepository userRepository;
    @Mock ConsentRepository consentRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock PublicCodeGenerator publicCodeGenerator;
    @Mock CareRecipientRepository careRecipientRepository;
    @Mock CareGuardianRepository careGuardianRepository;
    @Mock OrganizationRepository organizationRepository;
    @Mock OrganizationMemberRepository organizationMemberRepository;
    @Mock OrganizationRecipientLinkRepository organizationRecipientLinkRepository;
    @Mock CareAssignmentRepository careAssignmentRepository;

    @InjectMocks DevDataInitializer devDataInitializer;

    @Test
    @DisplayName("최초 실행 시 테스트 계정들과 함께 돌봄 당사자 및 worker 배정이 시딩된다")
    void run_initialSeed_createsUsersAndAssignment() {
        given(passwordEncoder.encode(any())).willReturn("encoded-pwd");
        given(publicCodeGenerator.generate(any())).willReturn("PUB123");

        given(userRepository.findByEmail("guardian@test.com")).willReturn(Optional.empty());
        given(userRepository.findByEmail("worker@test.com")).willReturn(Optional.empty());
        given(userRepository.findByEmail("institution@test.com")).willReturn(Optional.empty());
        given(userRepository.findByEmail("admin@test.com")).willReturn(Optional.empty());

        given(userRepository.save(any(User.class))).willAnswer(inv -> {
            User u = inv.getArgument(0);
            long id = 1L;
            if (u.getEmail().contains("guardian")) id = 1L;
            else if (u.getEmail().contains("worker")) id = 2L;
            else if (u.getEmail().contains("institution")) id = 3L;
            else if (u.getEmail().contains("admin")) id = 4L;
            ReflectionTestUtils.setField(u, "id", id);
            return u;
        });

        given(careRecipientRepository.findByCareRecipientNumber("R-TEST0001")).willReturn(Optional.empty());
        given(careRecipientRepository.save(any(CareRecipient.class))).willAnswer(inv -> {
            CareRecipient r = inv.getArgument(0);
            ReflectionTestUtils.setField(r, "id", 100L);
            return r;
        });

        given(careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(100L, 1L, GuardianStatus.ACTIVE))
                .willReturn(false);

        given(organizationRepository.findByOrganizationCode("ORG-TEST0001")).willReturn(Optional.empty());
        given(organizationRepository.save(any(Organization.class))).willAnswer(inv -> {
            Organization o = inv.getArgument(0);
            ReflectionTestUtils.setField(o, "id", 200L);
            return o;
        });

        given(organizationMemberRepository.existsByOrganizationIdAndUserIdAndStatus(200L, 2L, OrganizationMemberStatus.ACTIVE))
                .willReturn(false);

        given(organizationRecipientLinkRepository.findByOrganizationIdAndCareRecipientId(200L, 100L))
                .willReturn(Optional.empty());

        given(careAssignmentRepository.existsByIdempotencyKey("seed-assignment-worker-1"))
                .willReturn(false);

        devDataInitializer.run();

        // 1. 유저 4명 생성 검증
        verify(userRepository, times(4)).save(any(User.class));
        verify(consentRepository, times(4)).save(any(Consent.class));

        // 2. 당사자 및 보호자 링크 검증
        ArgumentCaptor<CareRecipient> recipientCaptor = ArgumentCaptor.forClass(CareRecipient.class);
        verify(careRecipientRepository).save(recipientCaptor.capture());
        assertThat(recipientCaptor.getValue().getCareRecipientNumber()).isEqualTo("R-TEST0001");
        assertThat(recipientCaptor.getValue().getName()).isEqualTo("김삼결");

        ArgumentCaptor<CareGuardian> guardianCaptor = ArgumentCaptor.forClass(CareGuardian.class);
        verify(careGuardianRepository).save(guardianCaptor.capture());
        assertThat(guardianCaptor.getValue().getCareRecipientId()).isEqualTo(100L);
        assertThat(guardianCaptor.getValue().getGuardianId()).isEqualTo(1L);
        assertThat(guardianCaptor.getValue().getStatus()).isEqualTo(GuardianStatus.ACTIVE);

        // 3. 기관 및 활동지원사 멤버 검증
        ArgumentCaptor<Organization> orgCaptor = ArgumentCaptor.forClass(Organization.class);
        verify(organizationRepository).save(orgCaptor.capture());
        assertThat(orgCaptor.getValue().getOrganizationCode()).isEqualTo("ORG-TEST0001");
        assertThat(orgCaptor.getValue().getOwnerId()).isEqualTo(3L);

        ArgumentCaptor<OrganizationMember> memberCaptor = ArgumentCaptor.forClass(OrganizationMember.class);
        verify(organizationMemberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getOrganizationId()).isEqualTo(200L);
        assertThat(memberCaptor.getValue().getUserId()).isEqualTo(2L);
        assertThat(memberCaptor.getValue().getStatus()).isEqualTo(OrganizationMemberStatus.ACTIVE);

        // 4. 기관-당사자 수락 링크 검증
        ArgumentCaptor<OrganizationRecipientLink> linkCaptor = ArgumentCaptor.forClass(OrganizationRecipientLink.class);
        verify(organizationRecipientLinkRepository).save(linkCaptor.capture());
        assertThat(linkCaptor.getValue().getOrganizationId()).isEqualTo(200L);
        assertThat(linkCaptor.getValue().getCareRecipientId()).isEqualTo(100L);
        assertThat(linkCaptor.getValue().getStatus()).isEqualTo(LinkStatus.ACCEPTED);

        // 5. 활동지원사 배정 검증
        ArgumentCaptor<CareAssignment> assignmentCaptor = ArgumentCaptor.forClass(CareAssignment.class);
        verify(careAssignmentRepository).save(assignmentCaptor.capture());
        CareAssignment savedAssignment = assignmentCaptor.getValue();
        assertThat(savedAssignment.getOrganizationId()).isEqualTo(200L);
        assertThat(savedAssignment.getCareRecipientId()).isEqualTo(100L);
        assertThat(savedAssignment.getSupportWorkerId()).isEqualTo(2L);
        assertThat(savedAssignment.getIdempotencyKey()).isEqualTo("seed-assignment-worker-1");
        assertThat(savedAssignment.isActive()).isTrue();
    }

    @Test
    @DisplayName("이미 데이터가 존재할 경우 중복 생성하지 않고 건너뛴다")
    void run_existingData_skipsCreation() {
        User guardian = User.builder().email("guardian@test.com").role(UserRole.GUARDIAN).build();
        ReflectionTestUtils.setField(guardian, "id", 1L);
        User worker = User.builder().email("worker@test.com").role(UserRole.SUPPORT_WORKER).build();
        ReflectionTestUtils.setField(worker, "id", 2L);
        User institution = User.builder().email("institution@test.com").role(UserRole.INSTITUTION).build();
        ReflectionTestUtils.setField(institution, "id", 3L);
        User admin = User.builder().email("admin@test.com").role(UserRole.ADMIN).build();
        ReflectionTestUtils.setField(admin, "id", 4L);

        given(userRepository.findByEmail("guardian@test.com")).willReturn(Optional.of(guardian));
        given(userRepository.findByEmail("worker@test.com")).willReturn(Optional.of(worker));
        given(userRepository.findByEmail("institution@test.com")).willReturn(Optional.of(institution));
        given(userRepository.findByEmail("admin@test.com")).willReturn(Optional.of(admin));

        CareRecipient recipient = CareRecipient.builder().careRecipientNumber("R-TEST0001").name("김삼결").build();
        ReflectionTestUtils.setField(recipient, "id", 100L);
        given(careRecipientRepository.findByCareRecipientNumber("R-TEST0001")).willReturn(Optional.of(recipient));

        given(careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(100L, 1L, GuardianStatus.ACTIVE))
                .willReturn(true);

        Organization org = Organization.builder().organizationCode("ORG-TEST0001").ownerId(3L).build();
        ReflectionTestUtils.setField(org, "id", 200L);
        given(organizationRepository.findByOrganizationCode("ORG-TEST0001")).willReturn(Optional.of(org));

        given(organizationMemberRepository.existsByOrganizationIdAndUserIdAndStatus(200L, 2L, OrganizationMemberStatus.ACTIVE))
                .willReturn(true);

        OrganizationRecipientLink link = OrganizationRecipientLink.builder().organizationId(200L).careRecipientId(100L).requestedById(1L).build();
        given(organizationRecipientLinkRepository.findByOrganizationIdAndCareRecipientId(200L, 100L))
                .willReturn(Optional.of(link));

        given(careAssignmentRepository.existsByIdempotencyKey("seed-assignment-worker-1"))
                .willReturn(true);

        devDataInitializer.run();

        verify(userRepository, never()).save(any());
        verify(careRecipientRepository, never()).save(any());
        verify(careGuardianRepository, never()).save(any());
        verify(organizationRepository, never()).save(any());
        verify(organizationMemberRepository, never()).save(any());
        verify(organizationRecipientLinkRepository, never()).save(any());
        verify(careAssignmentRepository, never()).save(any());
    }
}
