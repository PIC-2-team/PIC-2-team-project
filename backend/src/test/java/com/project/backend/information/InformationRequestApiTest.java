package com.project.backend.information;

import com.jayway.jsonpath.JsonPath;
import com.project.backend.care.entity.*;
import com.project.backend.care.repository.*;
import com.project.backend.notification.repository.NotificationRepository;
import com.project.backend.organization.entity.*;
import com.project.backend.organization.repository.*;
import com.project.backend.user.entity.*;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Transactional
class InformationRequestApiTest {
    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @Autowired CareRecipientRepository recipients;
    @Autowired CareGuardianRepository guardians;
    @Autowired CareAssignmentRepository assignments;
    @Autowired OrganizationRepository organizations;
    @Autowired OrganizationRecipientLinkRepository links;
    @Autowired NotificationRepository notifications;
    @MockitoBean Clock clock;
    MockMvc mvc;
    User guardian, secondary, worker, otherWorker, institution, outsider;
    CareRecipient recipient;
    String recipientPath;
    static final Instant NOW = Instant.parse("2026-10-14T03:00:00Z");

    @BeforeEach
    void setUp() {
        given(clock.instant()).willReturn(NOW);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        guardian = user("guardian", UserRole.GUARDIAN);
        secondary = user("secondary", UserRole.GUARDIAN);
        worker = user("worker", UserRole.SUPPORT_WORKER);
        otherWorker = user("other", UserRole.SUPPORT_WORKER);
        institution = user("institution", UserRole.INSTITUTION);
        outsider = user("outsider", UserRole.GUARDIAN);
        recipient = recipients.save(CareRecipient.builder().name("당사자").careRecipientNumber("R-00000001")
                .birthDate(LocalDate.of(2000, 1, 1)).gender(Gender.MALE).build());
        guardians.save(CareGuardian.builder().careRecipientId(recipient.getId()).guardianId(guardian.getId())
                .type(GuardianType.PRIMARY).status(GuardianStatus.ACTIVE).build());
        guardians.save(CareGuardian.builder().careRecipientId(recipient.getId()).guardianId(secondary.getId())
                .type(GuardianType.SECONDARY).status(GuardianStatus.ACTIVE).build());
        Organization org = organizations.save(Organization.builder().name("기관").ownerId(institution.getId())
                .organizationCode("AA-001").build());
        OrganizationRecipientLink link = OrganizationRecipientLink.builder().organizationId(org.getId())
                .careRecipientId(recipient.getId()).requestedById(guardian.getId()).build();
        link.accept();
        links.save(link);
        assign(worker, org.getId());
        assign(otherWorker, org.getId());
        recipientPath = "/api/care-recipients/" + recipient.getId() + "/information-requests";
    }

    @Test
    void requestMovesThroughLifecycleAndNotifiesParticipants() throws Exception {
        String created = perform(post(recipientPath).content("{\"message\":\"복용 시간을 알려주세요\"}"), worker)
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.data.requestedBy.id").value(worker.getId()))
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(created, "$.data.id")).longValue();
        perform(get("/api/information-requests"), worker).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].id").value(id));
        perform(get("/api/organizations/me/information-requests"), institution).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].id").value(id));
        perform(post("/api/organizations/me/information-requests/" + id + "/forward").content("{}"), institution)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("FORWARDED"));
        perform(get(recipientPath), secondary).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].id").value(id));
        perform(post(recipientPath + "/" + id + "/reply").content("{\"message\":\"매일 저녁 식후입니다\"}"), secondary)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("ANSWERED"))
                .andExpect(jsonPath("$.data.reply.message").value("매일 저녁 식후입니다"));
        perform(get("/api/notifications?read=false"), worker)
                .andExpect(jsonPath("$.data.items[0].type").value("INFORMATION_REQUEST_RECEIVED"));
        perform(post("/api/organizations/me/information-requests/" + id + "/close").content("{}"), institution)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("CLOSED"));
        assertThat(notifications.count()).isEqualTo(4L);
    }

    @Test
    void roleScopeAndTransitionsAreEnforced() throws Exception {
        perform(post(recipientPath).content("{\"message\":\"질문\"}"), institution).andExpect(status().isForbidden());
        String created = perform(post(recipientPath).content("{\"message\":\"질문\"}"), worker)
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(created, "$.data.id")).longValue();
        perform(get("/api/information-requests"), otherWorker)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.items").isEmpty());
        perform(get("/api/organizations/me/information-requests"), outsider).andExpect(status().isForbidden());
        perform(post(recipientPath + "/" + id + "/reply").content("{\"message\":\"답변\"}"), guardian)
                .andExpect(status().isConflict());
        perform(post("/api/organizations/me/information-requests/" + id + "/close").content("{}"), institution)
                .andExpect(status().isConflict());
        perform(post("/api/organizations/me/information-requests/" + id + "/forward").content("{}"), institution)
                .andExpect(status().isOk());
        perform(post("/api/organizations/me/information-requests/" + id + "/forward").content("{}"), institution)
                .andExpect(status().isConflict());
        perform(get(recipientPath), outsider).andExpect(status().isForbidden());
    }

    @Test
    void messageValidationAndNotificationPreferenceAreApplied() throws Exception {
        for (String message : List.of("", "   ", "가".repeat(1001))) {
            perform(post(recipientPath).content("{\"message\":\"" + message + "\"}"), worker)
                    .andExpect(status().isUnprocessableEntity());
        }
        guardian.updateNotificationSettings(true, true, true, true, false, true);
        String created = perform(post(recipientPath).content("{\"message\":\"질문\"}"), worker)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(created, "$.data.id")).longValue();
        perform(post("/api/organizations/me/information-requests/" + id + "/forward").content("{}"), institution)
                .andExpect(status().isOk());
        assertThat(notifications.count()).isEqualTo(2L);
        perform(get("/api/notifications?read=false"), guardian)
                .andExpect(jsonPath("$.data.items").isEmpty());
        perform(get("/api/notifications?read=false"), secondary)
                .andExpect(jsonPath("$.data.items.length()").value(1));
    }

    private User user(String name, UserRole role) {
        return users.save(User.builder().name(name).email(name + "@test.invalid")
                .publicCode("P-" + name.substring(0, Math.min(name.length(), 8))).role(role).build());
    }

    private void assign(User worker, Long organizationId) {
        assignments.save(CareAssignment.builder().careRecipientId(recipient.getId()).supportWorkerId(worker.getId())
                .organizationId(organizationId).startDate(LocalDate.of(2026, 10, 1))
                .idempotencyKey(UUID.randomUUID().toString()).build());
    }

    private org.springframework.test.web.servlet.ResultActions perform(MockHttpServletRequestBuilder request, User user)
            throws Exception {
        return mvc.perform(request.contentType(MediaType.APPLICATION_JSON).with(authentication(
                new UsernamePasswordAuthenticationToken(user.getId(), null, List.of()))));
    }
}
