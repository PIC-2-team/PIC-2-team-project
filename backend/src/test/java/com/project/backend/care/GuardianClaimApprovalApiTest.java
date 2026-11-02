package com.project.backend.care;

import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.care.service.CareAccessService;
import com.project.backend.common.security.JwtProvider;
import com.project.backend.notification.entity.NotificationType;
import com.project.backend.notification.repository.NotificationRepository;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationRecipientLink;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
class GuardianClaimApprovalApiTest {
    @Autowired WebApplicationContext context;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwt;
    @Autowired UserRepository users;
    @Autowired CareRecipientRepository recipients;
    @Autowired CareGuardianRepository guardians;
    @Autowired OrganizationRepository organizations;
    @Autowired OrganizationRecipientLinkRepository links;
    @Autowired NotificationRepository notifications;
    @Autowired CareAccessService access;
    MockMvc mvc;
    User claimant, owner, otherOwner;
    Organization org, otherOrg;
    CareRecipient transferred;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        claimant = user("claimant", UserRole.GUARDIAN);
        owner = user("owner", UserRole.INSTITUTION);
        otherOwner = user("owner2", UserRole.INSTITUTION);
        org = organizations.save(Organization.builder().name("기관").ownerId(owner.getId()).organizationCode("AAA001").build());
        otherOrg = organizations.save(Organization.builder().name("기관2").ownerId(otherOwner.getId()).organizationCode("AAA002").build());
        transferred = recipients.save(CareRecipient.builder().name("당사자").careRecipientNumber("R-TRANSFER")
                .birthDate(LocalDate.of(2000, 1, 1)).gender(Gender.MALE).build());
        transferred.transfer(LocalDateTime.of(2026, 11, 1, 0, 0));
        link(org, transferred);
    }

    @Test
    void claimOfTransferredRecipientBecomesPendingAndNotifiesTheOrganization() throws Exception {
        claim(claimant, "R-TRANSFER").andExpect(status().isAccepted()).andExpect(jsonPath("$.data.status").value("PENDING"));

        CareGuardian row = pendingClaim();
        assertThat(row.getGuardianId()).isEqualTo(claimant.getId());
        assertThat(access.hasAccess(claimant.getId(), transferred.getId())).as("대기 중에는 접근할 수 없다").isFalse();
        assertThat(notifications.findAll()).anyMatch(n -> n.getUserId().equals(owner.getId())
                && n.getType() == NotificationType.ORGANIZATION_LINK_REQUESTED);
    }

    @Test
    void claimOfRecipientWithoutAnyAcceptedOrganizationIsRejected() throws Exception {
        links.deleteAll(links.findByCareRecipientId(transferred.getId()));

        claim(claimant, "R-TRANSFER").andExpect(status().isConflict());
        assertThat(guardians.findByCareRecipientIdAndStatus(transferred.getId(), GuardianStatus.PENDING)).isEmpty();
    }

    @Test
    void secondClaimWhileAnotherIsPendingIsRejected() throws Exception {
        User other = user("other", UserRole.GUARDIAN);
        claim(claimant, "R-TRANSFER").andExpect(status().isAccepted());

        claim(other, "R-TRANSFER").andExpect(status().isConflict());
        claim(claimant, "R-TRANSFER").andExpect(status().isConflict());
    }

    @Test
    void expiredPendingClaimIsReplacedByANewClaim() throws Exception {
        User stale = user("stale", UserRole.GUARDIAN);
        CareGuardian old = pending(stale, LocalDateTime.now().minusDays(31));

        claim(claimant, "R-TRANSFER").andExpect(status().isAccepted());

        em.flush();
        em.clear();
        assertThat(guardians.findById(old.getId()).orElseThrow().getStatus()).isEqualTo(GuardianStatus.REVOKED);
        assertThat(pendingClaim().getGuardianId()).isEqualTo(claimant.getId());
    }

    @Test
    void organizationListsOnlyFreshClaimsOfItsOwnRecipients() throws Exception {
        pending(claimant, LocalDateTime.now().minusDays(1));
        CareRecipient elsewhere = recipients.save(CareRecipient.builder().name("다른").careRecipientNumber("R-ELSE")
                .birthDate(LocalDate.of(2001, 1, 1)).gender(Gender.FEMALE).build());
        elsewhere.transfer(LocalDateTime.now());
        link(otherOrg, elsewhere);
        guardians.save(CareGuardian.builder().careRecipientId(elsewhere.getId()).guardianId(user("g2", UserRole.GUARDIAN).getId())
                .type(GuardianType.PRIMARY).status(GuardianStatus.PENDING).build());
        CareRecipient stale = recipients.save(CareRecipient.builder().name("만료").careRecipientNumber("R-STALE")
                .birthDate(LocalDate.of(2002, 1, 1)).gender(Gender.MALE).build());
        stale.transfer(LocalDateTime.now());
        link(org, stale);
        CareGuardian staleRow = CareGuardian.builder().careRecipientId(stale.getId())
                .guardianId(user("g3", UserRole.GUARDIAN).getId()).type(GuardianType.PRIMARY)
                .status(GuardianStatus.PENDING).build();
        ReflectionTestUtils.setField(staleRow, "createdAt", LocalDateTime.now().minusDays(31));
        guardians.save(staleRow);

        mvc.perform(get("/api/organizations/me/guardian-claims").header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].careRecipientNumber").value("R-TRANSFER"))
                .andExpect(jsonPath("$.data[0].guardianName").value("claimant"));
    }

    @Test
    void acceptingActivatesTheClaimantAndClearsTheTransferMark() throws Exception {
        CareGuardian row = pending(claimant, LocalDateTime.now());

        decide(owner, row, "accept").andExpect(status().isOk());

        em.flush();
        em.clear();
        assertThat(guardians.findById(row.getId()).orElseThrow().getStatus()).isEqualTo(GuardianStatus.ACTIVE);
        assertThat(recipients.findById(transferred.getId()).orElseThrow().getTransferredAt()).isNull();
        assertThat(access.hasAccess(claimant.getId(), transferred.getId())).isTrue();
        assertThat(notifications.findAll()).anyMatch(n -> n.getUserId().equals(claimant.getId()));
    }

    @Test
    void rejectingRevokesTheClaimButKeepsTheTransferMark() throws Exception {
        CareGuardian row = pending(claimant, LocalDateTime.now());

        decide(owner, row, "reject").andExpect(status().isOk());

        em.flush();
        em.clear();
        assertThat(guardians.findById(row.getId()).orElseThrow().getStatus()).isEqualTo(GuardianStatus.REVOKED);
        assertThat(recipients.findById(transferred.getId()).orElseThrow().getTransferredAt()).isNotNull();
        assertThat(access.hasAccess(claimant.getId(), transferred.getId())).isFalse();
    }

    @Test
    void anotherOrganizationCannotDecide() throws Exception {
        CareGuardian row = pending(claimant, LocalDateTime.now());

        decide(otherOwner, row, "accept").andExpect(status().isForbidden());
        assertThat(guardians.findById(row.getId()).orElseThrow().getStatus()).isEqualTo(GuardianStatus.PENDING);
    }

    @Test
    void expiredOrAlreadyDecidedClaimsCannotBeDecided() throws Exception {
        CareGuardian expired = pending(claimant, LocalDateTime.now().minusDays(31));
        decide(owner, expired, "accept").andExpect(status().isConflict());

        User second = user("second", UserRole.GUARDIAN);
        CareGuardian fresh = pending(second, LocalDateTime.now());
        decide(owner, fresh, "reject").andExpect(status().isOk());
        decide(owner, fresh, "accept").andExpect(status().isConflict());
    }

    @Test
    void guardianLinkRequestNotifiesTheOrganizationOwner() throws Exception {
        CareRecipient own = recipients.save(CareRecipient.builder().name("내 당사자").careRecipientNumber("R-OWN")
                .birthDate(LocalDate.of(2003, 1, 1)).gender(Gender.MALE).build());
        guardians.save(CareGuardian.builder().careRecipientId(own.getId()).guardianId(claimant.getId())
                .type(GuardianType.PRIMARY).status(GuardianStatus.ACTIVE).build());

        mvc.perform(post("/api/care-recipients/" + own.getId() + "/organization-link-requests")
                .header("Authorization", bearer(claimant)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"organizationCode\":\"AAA002\"}")).andExpect(status().isCreated());

        assertThat(notifications.findAll()).anyMatch(n -> n.getUserId().equals(otherOwner.getId())
                && n.getType() == NotificationType.ORGANIZATION_LINK_REQUESTED);
    }

    private ResultActions claim(User u, String number) throws Exception {
        return mvc.perform(post("/api/care-recipients/claim").header("Authorization", bearer(u))
                .contentType(MediaType.APPLICATION_JSON).content("{\"careRecipientNumber\":\"" + number + "\"}"));
    }

    private ResultActions decide(User u, CareGuardian row, String decision) throws Exception {
        return mvc.perform(post("/api/organizations/me/guardian-claims/" + row.getId() + "/" + decision)
                .header("Authorization", bearer(u)));
    }

    private CareGuardian pending(User u, LocalDateTime createdAt) {
        CareGuardian row = CareGuardian.builder().careRecipientId(transferred.getId()).guardianId(u.getId())
                .type(GuardianType.PRIMARY).status(GuardianStatus.PENDING).build();
        ReflectionTestUtils.setField(row, "createdAt", createdAt);
        return guardians.save(row);
    }

    private CareGuardian pendingClaim() {
        List<CareGuardian> rows = guardians.findByCareRecipientIdAndStatus(transferred.getId(), GuardianStatus.PENDING);
        assertThat(rows).hasSize(1);
        return rows.get(0);
    }

    private void link(Organization o, CareRecipient r) {
        OrganizationRecipientLink l = OrganizationRecipientLink.builder().organizationId(o.getId())
                .careRecipientId(r.getId()).requestedById(1L).build();
        l.accept();
        links.save(l);
    }

    private String bearer(User u) {
        return "Bearer " + jwt.generateAccessToken(u.getId(), u.getRole().name());
    }

    private User user(String name, UserRole role) {
        return users.save(User.builder().name(name).email(name + "@test.invalid")
                .publicCode("P-" + name.substring(0, Math.min(name.length(), 8))).role(role).build());
    }
}
