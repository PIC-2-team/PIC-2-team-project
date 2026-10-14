package com.project.backend.organization.service;

import com.project.backend.care.entity.CareAssignment;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.organization.dto.AssignSupportWorkerRequest;
import com.project.backend.organization.dto.CareAssignmentResponse;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class CareAssignmentServiceTest {

    @Mock CareAssignmentRepository careAssignmentRepository;
    @Mock OrganizationMemberRepository organizationMemberRepository;
    @Mock OrganizationRecipientLinkRepository organizationRecipientLinkRepository;

    @InjectMocks CareAssignmentService careAssignmentService;

    @Test
    void assign_accepted_링크가_있으면_배정_생성() {
        given(organizationMemberRepository.existsByOrganizationIdAndUserIdAndStatus(
                1L, 10L, OrganizationMemberStatus.ACTIVE)).willReturn(true);
        given(organizationRecipientLinkRepository.existsByOrganizationIdAndCareRecipientIdAndStatus(
                1L, 20L, LinkStatus.ACCEPTED)).willReturn(true);
        given(careAssignmentRepository.existsByIdempotencyKey("idem-001")).willReturn(false);
        given(careAssignmentRepository.save(any())).willAnswer(inv -> {
            CareAssignment a = inv.getArgument(0);
            ReflectionTestUtils.setField(a, "id", 99L);
            return a;
        });

        AssignSupportWorkerRequest req = new AssignSupportWorkerRequest(
                20L, 30L, LocalDate.now(), null, "idem-001"
        );

        CareAssignmentResponse response = careAssignmentService.assign(1L, 10L, req);

        assertThat(response.careRecipientId()).isEqualTo(20L);
        assertThat(response.supportWorkerId()).isEqualTo(30L);
        assertThat(response.endedAt()).isNull();
    }

    @Test
    void assign_accepted_링크_없으면_FORBIDDEN_예외() {
        given(organizationMemberRepository.existsByOrganizationIdAndUserIdAndStatus(
                1L, 10L, OrganizationMemberStatus.ACTIVE)).willReturn(true);
        given(organizationRecipientLinkRepository.existsByOrganizationIdAndCareRecipientIdAndStatus(
                1L, 20L, LinkStatus.ACCEPTED)).willReturn(false);

        AssignSupportWorkerRequest req = new AssignSupportWorkerRequest(
                20L, 30L, LocalDate.now(), null, "idem-002"
        );

        assertThatThrownBy(() -> careAssignmentService.assign(1L, 10L, req))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void assign_중복_idempotencyKey로_CONFLICT_예외() {
        given(organizationMemberRepository.existsByOrganizationIdAndUserIdAndStatus(
                1L, 10L, OrganizationMemberStatus.ACTIVE)).willReturn(true);
        given(organizationRecipientLinkRepository.existsByOrganizationIdAndCareRecipientIdAndStatus(
                1L, 20L, LinkStatus.ACCEPTED)).willReturn(true);
        given(careAssignmentRepository.existsByIdempotencyKey("dupe-key")).willReturn(true);

        AssignSupportWorkerRequest req = new AssignSupportWorkerRequest(
                20L, 30L, LocalDate.now(), null, "dupe-key"
        );

        assertThatThrownBy(() -> careAssignmentService.assign(1L, 10L, req))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void endAssignment_endedAt_설정됨() {
        CareAssignment assignment = CareAssignment.builder()
                .organizationId(1L).careRecipientId(20L).supportWorkerId(30L)
                .idempotencyKey("k").startDate(LocalDate.now()).build();
        given(careAssignmentRepository.findById(99L)).willReturn(Optional.of(assignment));
        given(careAssignmentRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        careAssignmentService.endAssignment(99L);

        assertThat(assignment.isActive()).isFalse();
        assertThat(assignment.getEndedAt()).isNotNull();
    }

    @Test
    void endAssignment_존재하지_않는_배정은_NOT_FOUND_예외() {
        given(careAssignmentRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> careAssignmentService.endAssignment(999L))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.NOT_FOUND);
    }
}
