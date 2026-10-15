package com.project.backend.care.service;

import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.OrganizationMember;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.HttpStatus.FORBIDDEN;

@ExtendWith(MockitoExtension.class)
class CareAccessServiceTest {

    @Mock CareGuardianRepository careGuardianRepository;
    @Mock CareAssignmentRepository careAssignmentRepository;
    @Mock OrganizationMemberRepository organizationMemberRepository;
    @Mock OrganizationRecipientLinkRepository organizationRecipientLinkRepository;

    @InjectMocks CareAccessService careAccessService;

    private static final Long USER_ID = 10L;
    private static final Long RECIPIENT_ID = 20L;

    @Test
    void ACTIVE_보호자는_접근_가능() {
        given(careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                RECIPIENT_ID, USER_ID, GuardianStatus.ACTIVE)).willReturn(true);

        assertThat(careAccessService.hasAccess(USER_ID, RECIPIENT_ID)).isTrue();
    }

    @Test
    void 보호자_아니어도_활성_배정_지원사면_접근_가능() {
        given(careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                RECIPIENT_ID, USER_ID, GuardianStatus.ACTIVE)).willReturn(false);
        given(careAssignmentRepository.existsBySupportWorkerIdAndCareRecipientIdAndEndedAtIsNull(
                USER_ID, RECIPIENT_ID)).willReturn(true);

        assertThat(careAccessService.hasAccess(USER_ID, RECIPIENT_ID)).isTrue();
    }

    @Test
    void 기관_멤버이고_accepted_링크_있으면_접근_가능() {
        given(careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                RECIPIENT_ID, USER_ID, GuardianStatus.ACTIVE)).willReturn(false);
        given(careAssignmentRepository.existsBySupportWorkerIdAndCareRecipientIdAndEndedAtIsNull(
                USER_ID, RECIPIENT_ID)).willReturn(false);
        given(organizationMemberRepository.findByUserIdAndStatus(USER_ID, OrganizationMemberStatus.ACTIVE))
                .willReturn(List.of(activeMember(1L)));
        given(organizationRecipientLinkRepository.existsByOrganizationIdAndCareRecipientIdAndStatus(
                1L, RECIPIENT_ID, LinkStatus.ACCEPTED)).willReturn(true);

        assertThat(careAccessService.hasAccess(USER_ID, RECIPIENT_ID)).isTrue();
    }

    @Test
    void 관계없는_사용자는_접근_불가() {
        given(careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                RECIPIENT_ID, USER_ID, GuardianStatus.ACTIVE)).willReturn(false);
        given(careAssignmentRepository.existsBySupportWorkerIdAndCareRecipientIdAndEndedAtIsNull(
                USER_ID, RECIPIENT_ID)).willReturn(false);
        given(organizationMemberRepository.findByUserIdAndStatus(USER_ID, OrganizationMemberStatus.ACTIVE))
                .willReturn(List.of());

        assertThat(careAccessService.hasAccess(USER_ID, RECIPIENT_ID)).isFalse();
    }

    @Test
    void verifyAccess_접근_불가_사용자는_FORBIDDEN_예외() {
        given(careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                RECIPIENT_ID, USER_ID, GuardianStatus.ACTIVE)).willReturn(false);
        given(careAssignmentRepository.existsBySupportWorkerIdAndCareRecipientIdAndEndedAtIsNull(
                USER_ID, RECIPIENT_ID)).willReturn(false);
        given(organizationMemberRepository.findByUserIdAndStatus(USER_ID, OrganizationMemberStatus.ACTIVE))
                .willReturn(List.of());

        assertThatThrownBy(() -> careAccessService.verifyAccess(USER_ID, RECIPIENT_ID))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(FORBIDDEN);
    }

    private OrganizationMember activeMember(Long orgId) {
        return OrganizationMember.builder().organizationId(orgId).userId(USER_ID).build();
    }
}
