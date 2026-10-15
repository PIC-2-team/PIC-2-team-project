package com.project.backend.organization.service;

import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.organization.dto.CreateOrganizationRequest;
import com.project.backend.organization.dto.LinkRequestResponse;
import com.project.backend.organization.dto.MemberResponse;
import com.project.backend.organization.dto.OrganizationResponse;
import com.project.backend.organization.entity.*;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class OrganizationServiceTest {

    @Mock OrganizationRepository organizationRepository;
    @Mock OrganizationMemberRepository organizationMemberRepository;
    @Mock OrganizationRecipientLinkRepository organizationRecipientLinkRepository;
    @Mock CareAssignmentRepository careAssignmentRepository;
    @Mock CareGuardianRepository careGuardianRepository;
    @Mock CareRecipientRepository careRecipientRepository;
    @Mock UserRepository userRepository;

    @InjectMocks OrganizationService organizationService;

    @Test
    void create_INSTITUTION_사용자가_기관_생성() {
        User owner = institutionUser(1L);
        given(userRepository.findById(1L)).willReturn(Optional.of(owner));
        given(organizationRepository.existsByOrganizationCode(anyString())).willReturn(false);
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.empty());
        given(organizationRepository.save(any())).willAnswer(inv -> {
            Organization org = inv.getArgument(0);
            ReflectionTestUtils.setField(org, "id", 10L);
            return org;
        });

        OrganizationResponse response = organizationService.create(1L, new CreateOrganizationRequest("행복복지관"));

        assertThat(response.name()).isEqualTo("행복복지관");
        assertThat(response.organizationCode()).isNotBlank();
    }

    @Test
    void create_비Institution_사용자는_FORBIDDEN_예외() {
        User guardian = guardianUser(2L);
        given(userRepository.findById(2L)).willReturn(Optional.of(guardian));

        assertThatThrownBy(() -> organizationService.create(2L, new CreateOrganizationRequest("기관")))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void create_이미_기관_보유한_사용자는_CONFLICT_예외() {
        User owner = institutionUser(1L);
        given(userRepository.findById(1L)).willReturn(Optional.of(owner));
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.of(
                Organization.builder().ownerId(1L).name("기존기관").organizationCode("ORGCODE12").build()
        ));

        assertThatThrownBy(() -> organizationService.create(1L, new CreateOrganizationRequest("새기관")))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void getMembers_기관_소유자가_멤버_목록_조회() {
        Organization org = Organization.builder().ownerId(1L).name("복지관").organizationCode("CODE1234").build();
        ReflectionTestUtils.setField(org, "id", 10L);
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.of(org));

        OrganizationMember member = OrganizationMember.builder().organizationId(10L).userId(5L).build();
        ReflectionTestUtils.setField(member, "id", 50L);
        given(organizationMemberRepository.findByOrganizationId(10L)).willReturn(List.of(member));

        User worker = supportWorkerUser(5L);
        given(userRepository.findAllById(List.of(5L))).willReturn(List.of(worker));

        List<MemberResponse> result = organizationService.getMembers(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).userId()).isEqualTo(5L);
    }

    @Test
    void updateMemberStatus_비활성화_요청시_INACTIVE로_변경() {
        Organization org = Organization.builder().ownerId(1L).name("복지관").organizationCode("CODE1234").build();
        ReflectionTestUtils.setField(org, "id", 10L);
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.of(org));

        OrganizationMember member = OrganizationMember.builder().organizationId(10L).userId(5L).build();
        ReflectionTestUtils.setField(member, "id", 50L);
        given(organizationMemberRepository.findById(50L)).willReturn(Optional.of(member));

        User worker = supportWorkerUser(5L);
        given(userRepository.findById(5L)).willReturn(Optional.of(worker));

        MemberResponse result = organizationService.updateMemberStatus(1L, 50L, false);

        assertThat(result.status()).isEqualTo(OrganizationMemberStatus.INACTIVE);
    }

    @Test
    void getLinkRequests_기관_소유자가_연결_요청_목록_조회() {
        Organization org = Organization.builder().ownerId(1L).name("복지관").organizationCode("CODE1234").build();
        ReflectionTestUtils.setField(org, "id", 10L);
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.of(org));

        OrganizationRecipientLink link = OrganizationRecipientLink.builder()
                .organizationId(10L).careRecipientId(100L).requestedById(2L).build();
        ReflectionTestUtils.setField(link, "id", 1L);
        given(organizationRecipientLinkRepository.findByOrganizationId(10L)).willReturn(List.of(link));

        List<LinkRequestResponse> result = organizationService.getLinkRequests(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).careRecipientId()).isEqualTo(100L);
    }

    private User institutionUser(Long id) {
        User u = User.builder().name("기관").email("i@test.com").publicCode("I-X")
                .role(UserRole.INSTITUTION).build();
        ReflectionTestUtils.setField(u, "id", id);
        return u;
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
