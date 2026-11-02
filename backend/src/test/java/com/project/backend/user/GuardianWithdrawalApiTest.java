package com.project.backend.user;

import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.common.security.JwtProvider;
import com.project.backend.notification.repository.NotificationRepository;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationMember;
import com.project.backend.organization.entity.OrganizationRecipientLink;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
class GuardianWithdrawalApiTest {
    @Autowired WebApplicationContext context;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwt;
    @Autowired UserRepository users;
    @Autowired CareRecipientRepository recipients;
    @Autowired CareGuardianRepository guardians;
    @Autowired CareAssignmentRepository assignments;
    @Autowired OrganizationRepository organizations;
    @Autowired OrganizationMemberRepository members;
    @Autowired OrganizationRecipientLinkRepository links;
    @Autowired NotificationRepository notifications;
    MockMvc mvc;
    User guardian, secondary, worker, owner;
    Organization org;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        guardian = user("guardian", UserRole.GUARDIAN);
        secondary = user("secondary", UserRole.GUARDIAN);
        worker = user("worker", UserRole.SUPPORT_WORKER);
        owner = user("owner", UserRole.INSTITUTION);
        org = organizations.save(Organization.builder().name("기관").ownerId(owner.getId())
                .organizationCode("AA-001").build());
        members.save(OrganizationMember.builder().organizationId(org.getId()).userId(worker.getId()).build());
    }

    @Test
    void previewClassifiesEachRecipient() throws Exception {
        CareRecipient withSecond = recipient("R-1");
        CareRecipient withOrg = recipient("R-2");
        CareRecipient alone = recipient("R-3");
        primary(withSecond, guardian);
        secondary(withSecond, secondary, GuardianStatus.ACTIVE);
        primary(withOrg, guardian);
        link(withOrg);
        primary(alone, guardian);

        mvc.perform(get("/api/users/me/withdrawal-preview").header("Authorization", bearer(guardian)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recipients.length()").value(3))
                .andExpect(jsonPath("$.data.recipients[?(@.careRecipientId==" + withSecond.getId() + ")].resolution")
                        .value("SUCCESSION"))
                .andExpect(jsonPath("$.data.recipients[?(@.careRecipientId==" + withOrg.getId() + ")].resolution")
                        .value("CHOICE"))
                .andExpect(jsonPath("$.data.recipients[?(@.careRecipientId==" + alone.getId() + ")].resolution")
                        .value("DELETE_ONLY"));
    }

    @Test
    void activeSecondaryIsPromotedAndDataStays() throws Exception {
        CareRecipient r = recipient("R-1");
        primary(r, guardian);
        secondary(r, secondary, GuardianStatus.ACTIVE);

        withdraw(guardian, "{}").andExpect(status().isNoContent());

        assertThat(guardians.findByCareRecipientIdAndTypeAndStatus(r.getId(), GuardianType.PRIMARY, GuardianStatus.ACTIVE))
                .get().extracting(CareGuardian::getGuardianId).isEqualTo(secondary.getId());
        assertThat(guardians.findByCareRecipientIdAndGuardianIdAndStatus(r.getId(), guardian.getId(),
                GuardianStatus.ACTIVE)).isEmpty();
        assertThat(recipients.findById(r.getId())).isPresent();
    }

    @Test
    void transferClearsMedicalContactsAndKeepsRecipient() throws Exception {
        CareRecipient r = recipientWithContacts("R-1");
        primary(r, guardian);
        link(r);
        CareAssignment a = assign(r);

        withdraw(guardian, decision(r, "TRANSFER")).andExpect(status().isNoContent());

        em.flush();
        em.clear();
        CareRecipient saved = recipients.findById(r.getId()).orElseThrow();
        assertThat(saved.getHospitalName()).isNull();
        assertThat(saved.getDoctorName()).isNull();
        assertThat(saved.getHospitalPhone()).isNull();
        assertThat(saved.getSupportCenterName()).isNull();
        assertThat(saved.getSupportCenterManagerName()).isNull();
        assertThat(saved.getSupportCenterPhone()).isNull();
        assertThat(saved.getName()).isEqualTo("당사자");
        assertThat(saved.getTransferredAt()).isNotNull();
        assertThat(saved.getDeletedAt()).isNull();
        assertThat(guardians.findByCareRecipientIdAndStatus(r.getId(), GuardianStatus.ACTIVE)).isEmpty();
        assertThat(assignments.findById(a.getId()).orElseThrow().getEndedAt()).isNull();
        assertThat(links.findByCareRecipientId(r.getId())).hasSize(1);
        assertThat(notifications.findAll()).anyMatch(n -> n.getUserId().equals(owner.getId()));
    }

    @Test
    void deleteSoftDeletesAndCutsAllAccess() throws Exception {
        CareRecipient r = recipient("R-1");
        primary(r, guardian);
        link(r);
        CareAssignment a = assign(r);

        withdraw(guardian, decision(r, "DELETE")).andExpect(status().isNoContent());

        em.flush();
        em.clear();
        assertThat(recipients.findById(r.getId())).isEmpty();
        assertThat(((Number) em.createNativeQuery("select count(*) from care_recipient where id = :id and deleted_at is not null")
                .setParameter("id", r.getId()).getSingleResult()).intValue()).isEqualTo(1);
        assertThat(assignments.findById(a.getId()).orElseThrow().getEndedAt()).isNotNull();
        assertThat(guardians.findByCareRecipientIdAndStatus(r.getId(), GuardianStatus.ACTIVE)).isEmpty();
        assertThat(links.existsByOrganizationIdAndCareRecipientIdAndStatus(
                org.getId(), r.getId(), com.project.backend.organization.entity.LinkStatus.ACCEPTED)).isFalse();
    }

    @Test
    void missingDecisionIsRejectedAndNothingChanges() throws Exception {
        CareRecipient chosen = recipient("R-1");
        CareRecipient undecided = recipient("R-2");
        primary(chosen, guardian);
        primary(undecided, guardian);
        link(chosen);
        link(undecided);

        withdraw(guardian, decision(chosen, "DELETE")).andExpect(status().isUnprocessableEntity());

        em.flush();
        em.clear();
        assertThat(users.findById(guardian.getId()).orElseThrow().getDeletedAt()).isNull();
        assertThat(recipients.findById(chosen.getId())).isPresent();
    }

    @Test
    void transferWithoutLinkedOrganizationIsRejected() throws Exception {
        CareRecipient r = recipient("R-1");
        primary(r, guardian);

        withdraw(guardian, decision(r, "TRANSFER")).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void decisionForSomeoneElsesRecipientIsRejected() throws Exception {
        CareRecipient mine = recipient("R-1");
        CareRecipient others = recipient("R-2");
        primary(mine, guardian);
        primary(others, secondary);
        link(mine);

        withdraw(guardian, "{\"decisions\":[{\"careRecipientId\":" + mine.getId() + ",\"action\":\"DELETE\"},"
                + "{\"careRecipientId\":" + others.getId() + ",\"action\":\"DELETE\"}]}")
                .andExpect(status().isUnprocessableEntity());
        assertThat(recipients.findById(others.getId())).isPresent();
    }

    @Test
    void decisionForSuccessionRecipientIsRejectedAndNothingChanges() throws Exception {
        CareRecipient r = recipient("R-1");
        primary(r, guardian);
        secondary(r, secondary, GuardianStatus.ACTIVE);

        withdraw(guardian, decision(r, "DELETE")).andExpect(status().isUnprocessableEntity());

        em.flush();
        em.clear();
        assertThat(recipients.findById(r.getId())).isPresent();
        assertThat(guardians.findByCareRecipientIdAndTypeAndStatus(r.getId(), GuardianType.PRIMARY, GuardianStatus.ACTIVE))
                .get().extracting(CareGuardian::getGuardianId).isEqualTo(guardian.getId());
    }

    @Test
    void transferRevokesPendingSecondaryInvitation() throws Exception {
        CareRecipient r = recipient("R-1");
        primary(r, guardian);
        secondary(r, secondary, GuardianStatus.PENDING);
        link(r);

        withdraw(guardian, decision(r, "TRANSFER")).andExpect(status().isNoContent());

        assertThat(guardians.findByCareRecipientIdAndStatus(r.getId(), GuardianStatus.PENDING)).isEmpty();
        assertThat(guardians.findByCareRecipientIdAndStatus(r.getId(), GuardianStatus.ACTIVE)).isEmpty();
    }

    @Test
    void deleteRejectsPendingLinksButKeepsAlreadyRejectedOnes() throws Exception {
        CareRecipient r = recipient("R-1");
        primary(r, guardian);
        link(r);
        Organization other = organizations.save(Organization.builder().name("기관2").ownerId(owner.getId())
                .organizationCode("AA-002").build());
        OrganizationRecipientLink pending = links.save(OrganizationRecipientLink.builder()
                .organizationId(other.getId()).careRecipientId(r.getId()).requestedById(guardian.getId()).build());
        Organization third = organizations.save(Organization.builder().name("기관3").ownerId(owner.getId())
                .organizationCode("AA-003").build());
        OrganizationRecipientLink rejected = OrganizationRecipientLink.builder()
                .organizationId(third.getId()).careRecipientId(r.getId()).requestedById(guardian.getId()).build();
        rejected.reject();
        ReflectionTestUtils.setField(rejected, "decidedAt", LocalDateTime.of(2026, 1, 1, 0, 0));
        links.save(rejected);

        withdraw(guardian, decision(r, "DELETE")).andExpect(status().isNoContent());

        em.flush();
        em.clear();
        assertThat(links.findById(pending.getId()).orElseThrow().getStatus()).isEqualTo(LinkStatus.REJECTED);
        assertThat(links.findById(rejected.getId()).orElseThrow().getDecidedAt())
                .isEqualTo(LocalDateTime.of(2026, 1, 1, 0, 0));
    }

    @Test
    void withdrawingSecondaryOnlyLeavesRecipientUntouched() throws Exception {
        CareRecipient r = recipient("R-1");
        primary(r, guardian);
        secondary(r, secondary, GuardianStatus.ACTIVE);

        withdraw(secondary, "{}").andExpect(status().isNoContent());

        assertThat(guardians.findByCareRecipientIdAndTypeAndStatus(r.getId(), GuardianType.PRIMARY, GuardianStatus.ACTIVE))
                .get().extracting(CareGuardian::getGuardianId).isEqualTo(guardian.getId());
        assertThat(guardians.findByCareRecipientIdAndGuardianIdAndStatus(r.getId(), secondary.getId(),
                GuardianStatus.ACTIVE)).isEmpty();
    }

    @Test
    void withdrawnSecondaryIsNotPromotedLater() throws Exception {
        CareRecipient r = recipient("R-1");
        primary(r, guardian);
        secondary(r, secondary, GuardianStatus.ACTIVE);
        link(r);
        withdraw(secondary, "{}").andExpect(status().isNoContent());

        withdraw(guardian, "{}").andExpect(status().isUnprocessableEntity());
    }

    private org.springframework.test.web.servlet.ResultActions withdraw(User u, String body) throws Exception {
        MockHttpServletRequestBuilder req = delete("/api/users/me").header("Authorization", bearer(u))
                .contentType(MediaType.APPLICATION_JSON).content(body);
        return mvc.perform(req);
    }

    private String decision(CareRecipient r, String action) {
        return "{\"decisions\":[{\"careRecipientId\":" + r.getId() + ",\"action\":\"" + action + "\"}]}";
    }

    private String bearer(User u) {
        return "Bearer " + jwt.generateAccessToken(u.getId(), u.getRole().name());
    }

    private User user(String name, UserRole role) {
        return users.save(User.builder().name(name).email(name + "@test.invalid")
                .publicCode("P-" + name.substring(0, Math.min(name.length(), 8))).role(role).build());
    }

    private CareRecipient recipient(String number) {
        return recipients.save(CareRecipient.builder().name("당사자").careRecipientNumber(number)
                .birthDate(LocalDate.of(2000, 1, 1)).gender(Gender.MALE).build());
    }

    private CareRecipient recipientWithContacts(String number) {
        return recipients.save(CareRecipient.builder().name("당사자").careRecipientNumber(number)
                .birthDate(LocalDate.of(2000, 1, 1)).gender(Gender.MALE)
                .hospitalName("병원").doctorName("의사").hospitalPhone("02-111-2222")
                .supportCenterName("센터").supportCenterManagerName("담당").supportCenterPhone("02-333-4444").build());
    }

    private void primary(CareRecipient r, User u) {
        guardians.save(CareGuardian.builder().careRecipientId(r.getId()).guardianId(u.getId())
                .type(GuardianType.PRIMARY).status(GuardianStatus.ACTIVE).build());
    }

    private void secondary(CareRecipient r, User u, GuardianStatus s) {
        guardians.save(CareGuardian.builder().careRecipientId(r.getId()).guardianId(u.getId())
                .type(GuardianType.SECONDARY).status(s).build());
    }

    private void link(CareRecipient r) {
        OrganizationRecipientLink link = OrganizationRecipientLink.builder().organizationId(org.getId())
                .careRecipientId(r.getId()).requestedById(guardian.getId()).build();
        link.accept();
        links.save(link);
    }

    private CareAssignment assign(CareRecipient r) {
        return assignments.save(CareAssignment.builder().careRecipientId(r.getId())
                .supportWorkerId(worker.getId()).organizationId(org.getId()).startDate(LocalDate.of(2026, 10, 1))
                .idempotencyKey(UUID.randomUUID().toString()).build());
    }
}
