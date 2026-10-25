package com.project.backend.organization;

import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.service.CareAccessService;
import com.project.backend.organization.entity.*;
import com.project.backend.organization.repository.*;
import com.project.backend.organization.service.OrganizationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class OrganizationGuardianRemovalTest {
    @Autowired OrganizationRepository organizations;
    @Autowired OrganizationGuardianLinkRepository guardianLinks;
    @Autowired OrganizationRecipientLinkRepository recipientLinks;
    @Autowired OrganizationMemberRepository members;
    @Autowired CareGuardianRepository guardians;
    @Autowired CareAssignmentRepository assignments;
    @Autowired OrganizationService service;
    @Autowired CareAccessService access;

    @Test
    void removingLastGuardianRevokesMemberAndAssignedWorkerAccess() {
        Organization org = organization(101L, "REMOVE");
        linkGuardian(org, 102L, 103L, GuardianStatus.ACTIVE);
        members.save(OrganizationMember.builder().organizationId(org.getId()).userId(104L).build());
        CareAssignment assignment = assign(org, 103L, 105L);
        assertThat(access.hasAccess(104L, 103L)).isTrue();
        assertThat(access.hasAccess(105L, 103L)).isTrue();

        service.removeGuardian(101L, 102L);

        assertThat(guardianLinks.findByOrganizationIdAndGuardianId(org.getId(), 102L)).isEmpty();
        assertThat(recipientLinks.findByOrganizationIdAndCareRecipientId(org.getId(), 103L)).isEmpty();
        assertThat(assignment.isActive()).isFalse();
        assertThat(access.hasAccess(104L, 103L)).isFalse();
        assertThat(access.hasAccess(105L, 103L)).isFalse();
    }

    @Test
    void anotherActiveGuardianPreservesAccessUntilLastGuardianIsRemoved() {
        Organization org = organization(201L, "RETAIN");
        linkGuardian(org, 202L, 203L, GuardianStatus.ACTIVE);
        guardianLinks.save(OrganizationGuardianLink.builder().organizationId(org.getId()).guardianId(204L).build());
        guardians.save(CareGuardian.builder().guardianId(204L).careRecipientId(203L)
                .type(GuardianType.SECONDARY).status(GuardianStatus.ACTIVE).build());
        CareAssignment assignment = assign(org, 203L, 205L);

        service.removeGuardian(201L, 202L);

        assertThat(recipientLinks.findByOrganizationIdAndCareRecipientId(org.getId(), 203L)).isPresent();
        assertThat(assignment.isActive()).isTrue();
        assertThat(access.hasAccess(205L, 203L)).isTrue();

        service.removeGuardian(201L, 204L);

        assertThat(recipientLinks.findByOrganizationIdAndCareRecipientId(org.getId(), 203L)).isEmpty();
        assertThat(assignment.isActive()).isFalse();
        assertThat(access.hasAccess(205L, 203L)).isFalse();
    }

    @Test
    void removalDoesNotEndAssignmentsFromAnotherInstitution() {
        Organization org = organization(301L, "FIRST");
        Organization other = organization(302L, "SECOND");
        linkGuardian(org, 303L, 304L, GuardianStatus.ACTIVE);
        OrganizationRecipientLink otherLink = OrganizationRecipientLink.builder().organizationId(other.getId())
                .careRecipientId(304L).requestedById(303L).build();
        otherLink.accept();
        recipientLinks.save(otherLink);
        CareAssignment removed = assign(org, 304L, 305L);
        CareAssignment retained = assign(other, 304L, 306L);

        service.removeGuardian(301L, 303L);

        assertThat(removed.isActive()).isFalse();
        assertThat(retained.isActive()).isTrue();
        assertThat(recipientLinks.findByOrganizationIdAndCareRecipientId(other.getId(), 304L)).isPresent();
        assertThat(access.hasAccess(306L, 304L)).isTrue();
    }

    @Test
    void expiredGuardianRelationsDoNotLeaveInstitutionAccessBehind() {
        Organization org = organization(401L, "EXPIRED");
        linkGuardian(org, 402L, 403L, GuardianStatus.REVOKED);
        CareAssignment assignment = assign(org, 403L, 404L);

        service.removeGuardian(401L, 402L);

        assertThat(assignment.isActive()).isFalse();
        assertThat(access.hasAccess(404L, 403L)).isFalse();
    }

    private Organization organization(Long ownerId, String code) {
        return organizations.save(Organization.builder().ownerId(ownerId).name("테스트 기관")
                .organizationCode(code).build());
    }

    private void linkGuardian(Organization org, Long guardianId, Long recipientId, GuardianStatus status) {
        guardianLinks.save(OrganizationGuardianLink.builder().organizationId(org.getId()).guardianId(guardianId).build());
        guardians.save(CareGuardian.builder().guardianId(guardianId).careRecipientId(recipientId)
                .type(GuardianType.PRIMARY).status(status).build());
        OrganizationRecipientLink link = OrganizationRecipientLink.builder().organizationId(org.getId())
                .careRecipientId(recipientId).requestedById(guardianId).build();
        link.accept();
        recipientLinks.save(link);
    }

    private CareAssignment assign(Organization org, Long recipientId, Long workerId) {
        return assignments.save(CareAssignment.builder().organizationId(org.getId()).careRecipientId(recipientId)
                .supportWorkerId(workerId).idempotencyKey("assignment-" + workerId)
                .startDate(LocalDate.now()).build());
    }
}
