package com.project.backend.organization.service;

import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.organization.dto.RegisterOrganizationRequest;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

import com.project.backend.care.entity.CareGuardian;
import com.project.backend.care.entity.CareRecipient;
import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.entity.GuardianType;
import com.project.backend.organization.dto.RegisterGuardianRequest;

@ExtendWith(MockitoExtension.class)
class OrganizationServiceTest {

    @Mock OrganizationRepository organizationRepository;
    @Mock OrganizationMemberRepository organizationMemberRepository;
    @Mock OrganizationRecipientLinkRepository organizationRecipientLinkRepository;
    @Mock com.project.backend.organization.repository.OrganizationGuardianLinkRepository organizationGuardianLinkRepository;
    @Mock CareAssignmentRepository careAssignmentRepository;
    @Mock CareGuardianRepository careGuardianRepository;
    @Mock CareRecipientRepository careRecipientRepository;
    @Mock UserRepository userRepository;

    @InjectMocks OrganizationService organizationService;

    @Test
    void register_INSTITUTION_사용자가_유효한_6자리_코드로_기관_등록() {
        User owner = institutionUser(1L);
        given(userRepository.findById(1L)).willReturn(Optional.of(owner));
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.empty());

        Organization org = Organization.builder().name("행복복지관").organizationCode("KNU001").ownerId(null).build();
        ReflectionTestUtils.setField(org, "id", 10L);
        given(organizationRepository.findByOrganizationCode("KNU001")).willReturn(Optional.of(org));

        OrganizationResponse response = organizationService.register(1L, new RegisterOrganizationRequest("KNU001"));

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.name()).isEqualTo("행복복지관");
        assertThat(response.organizationCode()).isEqualTo("KNU001");
        assertThat(org.getOwnerId()).isEqualTo(1L);
    }

    @Test
    void register_비Institution_사용자는_FORBIDDEN_예외() {
        User guardian = guardianUser(2L);
        given(userRepository.findById(2L)).willReturn(Optional.of(guardian));

        assertThatThrownBy(() -> organizationService.register(2L, new RegisterOrganizationRequest("KNU001")))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void register_이미_기관_보유한_사용자는_CONFLICT_예외() {
        User owner = institutionUser(1L);
        given(userRepository.findById(1L)).willReturn(Optional.of(owner));
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.of(
                Organization.builder().ownerId(1L).name("기존기관").organizationCode("ORG101").build()
        ));

        assertThatThrownBy(() -> organizationService.register(1L, new RegisterOrganizationRequest("KNU001")))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void register_존재하지_않는_기관코드는_NOT_FOUND_예외() {
        User owner = institutionUser(1L);
        given(userRepository.findById(1L)).willReturn(Optional.of(owner));
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.empty());
        given(organizationRepository.findByOrganizationCode("NOT999")).willReturn(Optional.empty());

        assertThatThrownBy(() -> organizationService.register(1L, new RegisterOrganizationRequest("NOT999")))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void register_이미_다른_담당자가_등록한_기관코드는_CONFLICT_예외() {
        User owner = institutionUser(1L);
        given(userRepository.findById(1L)).willReturn(Optional.of(owner));
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.empty());

        Organization org = Organization.builder().name("선점기관").organizationCode("OCC001").ownerId(99L).build();
        given(organizationRepository.findByOrganizationCode("OCC001")).willReturn(Optional.of(org));

        assertThatThrownBy(() -> organizationService.register(1L, new RegisterOrganizationRequest("OCC001")))
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
    void addMember_지원사_고유코드로_기존_계정을_연결한다() {
        Organization org = Organization.builder().ownerId(1L).name("복지관").organizationCode("CODE1234").build();
        ReflectionTestUtils.setField(org, "id", 10L);
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.of(org));

        User worker = supportWorkerUser(20L);
        given(userRepository.findByPublicCode("S-ABCDEFGH")).willReturn(Optional.of(worker));
        given(organizationMemberRepository.findByUserIdAndStatus(20L, OrganizationMemberStatus.ACTIVE)).willReturn(List.of());
        given(organizationMemberRepository.findByOrganizationIdAndUserId(10L, 20L)).willReturn(Optional.empty());
        given(organizationMemberRepository.save(any())).willAnswer(inv -> {
            OrganizationMember m = inv.getArgument(0);
            ReflectionTestUtils.setField(m, "id", 5L);
            return m;
        });

        var req = new com.project.backend.organization.dto.AddMemberRequest("s-abcdefgh");
        MemberResponse response = organizationService.addMember(1L, req);

        assertThat(response.name()).isEqualTo("지원사");
        assertThat(response.publicCode()).isEqualTo("S-X");
        assertThat(response.userId()).isEqualTo(20L);
        verify(userRepository, never()).save(any());
    }

    @Test
    void addMember_다른_기관에_활성_소속인_지원사는_등록할_수_없다() {
        Organization org = Organization.builder().ownerId(1L).name("복지관").organizationCode("CODE1234").build();
        ReflectionTestUtils.setField(org, "id", 10L);
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.of(org));
        given(userRepository.findByPublicCode("S-ABCDEFGH")).willReturn(Optional.of(supportWorkerUser(20L)));
        given(organizationMemberRepository.findByUserIdAndStatus(20L, OrganizationMemberStatus.ACTIVE))
                .willReturn(List.of(OrganizationMember.builder().organizationId(99L).userId(20L).build()));

        assertThatThrownBy(() -> organizationService.addMember(1L, new com.project.backend.organization.dto.AddMemberRequest("S-ABCDEFGH")))
                .isInstanceOf(ApiException.class).extracting("status").isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void addMember_같은_기관에_이미_등록된_지원사는_중복_등록할_수_없다() {
        Organization org = Organization.builder().ownerId(1L).name("복지관").organizationCode("CODE1234").build();
        ReflectionTestUtils.setField(org, "id", 10L);
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.of(org));
        given(userRepository.findByPublicCode("S-ABCDEFGH")).willReturn(Optional.of(supportWorkerUser(20L)));
        given(organizationMemberRepository.findByUserIdAndStatus(20L, OrganizationMemberStatus.ACTIVE))
                .willReturn(List.of(OrganizationMember.builder().organizationId(10L).userId(20L).build()));

        assertThatThrownBy(() -> organizationService.addMember(1L, new com.project.backend.organization.dto.AddMemberRequest("S-ABCDEFGH")))
                .isInstanceOf(ApiException.class).extracting("status").isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void addMember_존재하지_않는_고유코드는_NOT_FOUND() {
        Organization org = Organization.builder().ownerId(1L).name("복지관").organizationCode("CODE1234").build();
        ReflectionTestUtils.setField(org, "id", 10L);
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.of(org));
        given(userRepository.findByPublicCode("S-ABCDEFGH")).willReturn(Optional.empty());

        assertThatThrownBy(() -> organizationService.addMember(1L, new com.project.backend.organization.dto.AddMemberRequest("S-ABCDEFGH")))
                .isInstanceOf(ApiException.class).extracting("status").isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void addMember_전화번호나_이름은_고유코드로_사용할_수_없다() {
        Organization org = Organization.builder().ownerId(1L).name("복지관").organizationCode("CODE1234").build();
        ReflectionTestUtils.setField(org, "id", 10L);
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.of(org));

        assertThatThrownBy(() -> organizationService.addMember(1L, new com.project.backend.organization.dto.AddMemberRequest("01012345678")))
                .isInstanceOf(ApiException.class).extracting("status").isEqualTo(HttpStatus.BAD_REQUEST);
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

    @Test
    void registerGuardian_기관이_보호자_고유코드로_등록시_링크_생성_및_기존_당사자_자동_연결() {
        Organization org = Organization.builder().ownerId(1L).name("테스트기관").organizationCode("ORG123").build();
        ReflectionTestUtils.setField(org, "id", 10L);
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.of(org));

        User guardian = guardianUser(2L);
        given(userRepository.findByPublicCode("P-ABCDEFGH")).willReturn(Optional.of(guardian));
        given(organizationGuardianLinkRepository.existsByOrganizationIdAndGuardianId(10L, 2L)).willReturn(false);

        com.project.backend.organization.entity.OrganizationGuardianLink savedLink =
                com.project.backend.organization.entity.OrganizationGuardianLink.builder()
                        .organizationId(10L).guardianId(2L).build();
        ReflectionTestUtils.setField(savedLink, "id", 100L);
        given(organizationGuardianLinkRepository.save(any())).willReturn(savedLink);

        CareGuardian cg = CareGuardian.builder().careRecipientId(50L).guardianId(2L).type(GuardianType.PRIMARY).status(GuardianStatus.ACTIVE).build();
        given(careGuardianRepository.findByGuardianIdAndStatus(2L, GuardianStatus.ACTIVE)).willReturn(List.of(cg));
        given(organizationRecipientLinkRepository.findByOrganizationIdAndCareRecipientId(10L, 50L)).willReturn(Optional.empty());

        CareRecipient recipient = CareRecipient.builder().name("김당사").careRecipientNumber("R-1234").build();
        ReflectionTestUtils.setField(recipient, "id", 50L);
        given(careRecipientRepository.findAllById(List.of(50L))).willReturn(List.of(recipient));

        var response = organizationService.registerGuardian(1L, new RegisterGuardianRequest("p-abcdefgh"));

        assertThat(response.guardianId()).isEqualTo(2L);
        assertThat(response.phone()).isEqualTo("010-1234-5678");
        assertThat(response.careRecipients()).hasSize(1);
        assertThat(response.careRecipients().get(0).name()).isEqualTo("김당사");
        verify(organizationRecipientLinkRepository).save(any());
    }

    @Test
    void registerGuardian_전화번호는_고유코드로_사용할_수_없다() {
        Organization org = Organization.builder().ownerId(1L).name("복지관").organizationCode("CODE1234").build();
        ReflectionTestUtils.setField(org, "id", 10L);
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.of(org));

        assertThatThrownBy(() -> organizationService.registerGuardian(1L, new RegisterGuardianRequest("01012345678")))
                .isInstanceOf(ApiException.class).extracting("status").isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void registerGuardian_같은_기관에_이미_등록된_보호자는_중복_등록할_수_없다() {
        Organization org = Organization.builder().ownerId(1L).name("복지관").organizationCode("CODE1234").build();
        ReflectionTestUtils.setField(org, "id", 10L);
        given(organizationRepository.findByOwnerId(1L)).willReturn(Optional.of(org));
        given(userRepository.findByPublicCode("P-ABCDEFGH")).willReturn(Optional.of(guardianUser(2L)));
        given(organizationGuardianLinkRepository.existsByOrganizationIdAndGuardianId(10L, 2L)).willReturn(true);

        assertThatThrownBy(() -> organizationService.registerGuardian(1L, new RegisterGuardianRequest("P-ABCDEFGH")))
                .isInstanceOf(ApiException.class).extracting("status").isEqualTo(HttpStatus.CONFLICT);
    }

    private User institutionUser(Long id) {
        User u = User.builder().name("기관").email("i@test.com").publicCode("I-X")
                .role(UserRole.INSTITUTION).build();
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    private User guardianUser(Long id) {
        User u = User.builder().name("보호자").email("g@test.com").phone("010-1234-5678").publicCode("P-X")
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
