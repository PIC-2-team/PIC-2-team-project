package com.project.backend.user;

import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.common.security.JwtProvider;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationMember;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import com.project.backend.organization.entity.OrganizationRecipientLink;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.record.entity.DailyRecord;
import com.project.backend.record.entity.RecordCategory;
import com.project.backend.record.repository.DailyRecordRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
class StaffWithdrawalApiTest {
    static final Instant NOW = Instant.parse("2026-11-01T00:00:00Z");

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
    @Autowired DailyRecordRepository records;
    MockMvc mvc;
    User guardian, worker, otherWorker, owner, otherOwner;
    Organization org, otherOrg;
    CareRecipient recipient;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        guardian = user("guardian", UserRole.GUARDIAN);
        worker = user("worker", UserRole.SUPPORT_WORKER);
        otherWorker = user("other", UserRole.SUPPORT_WORKER);
        owner = user("owner", UserRole.INSTITUTION);
        otherOwner = user("owner2", UserRole.INSTITUTION);
        org = organizations.save(Organization.builder().name("기관").ownerId(owner.getId()).organizationCode("AAA001").build());
        otherOrg = organizations.save(Organization.builder().name("기관2").ownerId(otherOwner.getId()).organizationCode("AAA002").build());
        members.save(OrganizationMember.builder().organizationId(org.getId()).userId(worker.getId()).build());
        members.save(OrganizationMember.builder().organizationId(org.getId()).userId(otherWorker.getId()).build());
        recipient = recipients.save(CareRecipient.builder().name("당사자").careRecipientNumber("R-1")
                .birthDate(LocalDate.of(2000, 1, 1)).gender(Gender.MALE).build());
        guardians.save(CareGuardian.builder().careRecipientId(recipient.getId()).guardianId(guardian.getId())
                .type(GuardianType.PRIMARY).status(GuardianStatus.ACTIVE).build());
        OrganizationRecipientLink link = OrganizationRecipientLink.builder().organizationId(org.getId())
                .careRecipientId(recipient.getId()).requestedById(guardian.getId()).build();
        link.accept();
        links.save(link);
    }

    @Test
    void workerWithdrawalEndsOwnAssignmentsAndLeavesOthers() throws Exception {
        CareAssignment mine = assign(worker, org);
        CareAssignment others = assign(otherWorker, org);

        mvc.perform(delete("/api/users/me").header("Authorization", bearer(worker))).andExpect(status().isNoContent());

        em.flush();
        em.clear();
        assertThat(assignments.findById(mine.getId()).orElseThrow().getEndedAt()).isNotNull();
        assertThat(assignments.findById(others.getId()).orElseThrow().getEndedAt()).isNull();
        assertThat(members.findByOrganizationIdAndUserId(org.getId(), worker.getId()).orElseThrow().getStatus())
                .isEqualTo(OrganizationMemberStatus.INACTIVE);
        assertThat(users.findById(worker.getId()).orElseThrow().getDeletedAt()).isNotNull();
    }

    @Test
    void institutionWithdrawalClearsOwnerEndsOrgAssignmentsAndKeepsMembersAndLinks() throws Exception {
        CareAssignment inOrg = assign(worker, org);
        CareAssignment inOther = assign(otherWorker, otherOrg);

        mvc.perform(delete("/api/users/me").header("Authorization", bearer(owner))).andExpect(status().isNoContent());

        em.flush();
        em.clear();
        assertThat(organizations.findById(org.getId()).orElseThrow().getOwnerId()).isNull();
        assertThat(organizations.findById(otherOrg.getId()).orElseThrow().getOwnerId()).isEqualTo(otherOwner.getId());
        assertThat(assignments.findById(inOrg.getId()).orElseThrow().getEndedAt()).isNotNull();
        assertThat(assignments.findById(inOther.getId()).orElseThrow().getEndedAt()).isNull();
        assertThat(members.findByOrganizationIdAndStatus(org.getId(), OrganizationMemberStatus.ACTIVE)).hasSize(2);
        assertThat(links.findByOrganizationId(org.getId())).singleElement()
                .extracting(OrganizationRecipientLink::getStatus).isEqualTo(LinkStatus.ACCEPTED);
    }

    @Test
    void institutionWithdrawalRotatesCodeSoTheOldSharedCodeCannotTakeOverTheOrganization() throws Exception {
        String oldCode = org.getOrganizationCode();
        User successor = user("successor", UserRole.INSTITUTION);

        mvc.perform(delete("/api/users/me").header("Authorization", bearer(owner))).andExpect(status().isNoContent());

        em.flush();
        em.clear();
        String newCode = organizations.findById(org.getId()).orElseThrow().getOrganizationCode();
        assertThat(newCode).isNotEqualTo(oldCode).matches("[A-Z0-9]{6}");
        assertThat(organizations.findById(otherOrg.getId()).orElseThrow().getOrganizationCode()).isEqualTo("AAA002");
        mvc.perform(post("/api/organizations").header("Authorization", bearer(successor))
                .contentType(MediaType.APPLICATION_JSON).content("{\"organizationCode\":\"" + oldCode + "\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/organizations").header("Authorization", bearer(successor))
                .contentType(MediaType.APPLICATION_JSON).content("{\"organizationCode\":\"" + newCode + "\"}"))
                .andExpect(status().isCreated());
        assertThat(organizations.findById(org.getId()).orElseThrow().getOwnerId()).isEqualTo(successor.getId());
    }

    @Test
    void previewTellsHowManyAssignmentsWillEnd() throws Exception {
        assign(worker, org);
        assign(otherWorker, org);

        mvc.perform(get("/api/users/me/withdrawal-preview").header("Authorization", bearer(worker)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.endedAssignmentCount").value(1));
        mvc.perform(get("/api/users/me/withdrawal-preview").header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.endedAssignmentCount").value(2));
        mvc.perform(get("/api/users/me/withdrawal-preview").header("Authorization", bearer(guardian)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.endedAssignmentCount").value(0));
    }

    @Test
    void guardianCanDeleteButNotEditRecordsOfAWithdrawnAuthor() throws Exception {
        assign(worker, org);
        DailyRecord record = records.save(DailyRecord.builder().careRecipientId(recipient.getId())
                .authorId(worker.getId()).content("기록").category(RecordCategory.OTHER)
                .recordedAt(NOW).pinned(false).now(NOW).build());
        String path = "/api/care-recipients/" + recipient.getId() + "/records/" + record.getId();
        mvc.perform(delete("/api/users/me").header("Authorization", bearer(worker))).andExpect(status().isNoContent());

        mvc.perform(patch(path).header("Authorization", bearer(guardian)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"수정\"}")).andExpect(status().isForbidden());
        mvc.perform(delete(path).header("Authorization", bearer(guardian))).andExpect(status().isOk());

        em.flush();
        em.clear();
        assertThat(records.findById(record.getId()).orElseThrow().getDeletedAt()).isNotNull();
    }

    @Test
    void guardianCannotDeleteRecordsOfAnActiveAuthor() throws Exception {
        DailyRecord record = records.save(DailyRecord.builder().careRecipientId(recipient.getId())
                .authorId(worker.getId()).content("기록").category(RecordCategory.OTHER)
                .recordedAt(NOW).pinned(false).now(NOW).build());
        assign(worker, org);

        mvc.perform(delete("/api/care-recipients/" + recipient.getId() + "/records/" + record.getId())
                .header("Authorization", bearer(guardian))).andExpect(status().isForbidden());
    }

    private CareAssignment assign(User w, Organization o) {
        return assignments.save(CareAssignment.builder().careRecipientId(recipient.getId())
                .supportWorkerId(w.getId()).organizationId(o.getId()).startDate(LocalDate.of(2026, 10, 1))
                .idempotencyKey(UUID.randomUUID().toString()).build());
    }

    private String bearer(User u) {
        return "Bearer " + jwt.generateAccessToken(u.getId(), u.getRole().name());
    }

    private User user(String name, UserRole role) {
        return users.save(User.builder().name(name).email(name + "@test.invalid")
                .publicCode("P-" + name.substring(0, Math.min(name.length(), 8))).role(role).build());
    }
}
