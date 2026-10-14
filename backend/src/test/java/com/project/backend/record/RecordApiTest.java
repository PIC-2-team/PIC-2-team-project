package com.project.backend.record;

import com.jayway.jsonpath.JsonPath;
import com.project.backend.common.security.JwtProvider;
import jakarta.persistence.EntityManager;
import com.project.backend.care.entity.*;
import com.project.backend.care.repository.*;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.*;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Transactional
class RecordApiTest {
    @Autowired WebApplicationContext context;
    @Autowired EntityManager entityManager;
    @Autowired JwtProvider jwt;
    @Autowired UserRepository users;
    @Autowired CareRecipientRepository recipients;
    @Autowired CareGuardianRepository guardians;
    @Autowired CareAssignmentRepository assignments;
    @Autowired OrganizationRepository organizations;
    @Autowired OrganizationRecipientLinkRepository links;
    @MockitoBean Clock clock;
    MockMvc mvc;
    User guardian, secondary, worker, otherWorker, institution, outsider;
    CareRecipient recipient, otherRecipient;
    CareAssignment assignment;
    String base;
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
        recipient = recipient("R-00000001");
        otherRecipient = recipient("R-00000002");
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
        assignment = assign(worker, LocalDate.of(2026, 10, 1), null, org.getId());
        assign(otherWorker, LocalDate.of(2026, 10, 1), null, org.getId());
        base = "/api/care-recipients/" + recipient.getId();
    }

    @Test
    void lifecyclePreservesPreviousRevisionAndHidesDeletedRecords() throws Exception {
        long id = create(worker, "  원래 내용  ", "2026-10-14T12:00:00+09:00");
        perform(get(base + "/records/" + id), guardian)
                .andExpect(jsonPath("$.data.content").value("원래 내용"))
                .andExpect(jsonPath("$.data.recordedAt").value("2026-10-14T03:00:00Z"))
                .andExpect(jsonPath("$.data.author.id").value(worker.getId()))
                .andExpect(jsonPath("$.data.media").isEmpty());
        perform(patch(base + "/records/" + id).content("{\"content\":\"수정 내용\"}"), guardian)
                .andExpect(status().isOk());
        entityManager.flush();
        entityManager.clear();
        perform(get(base + "/records/" + id + "/revisions"), guardian)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.items[0].revision").value(1))
                .andExpect(jsonPath("$.data.items[0].content").value("원래 내용"))
                .andExpect(jsonPath("$.data.items[0].changedBy.id").value(guardian.getId()));
        perform(delete(base + "/records/" + id), worker).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.restoreUntil").value("2026-11-13T03:00:00Z"));
        entityManager.flush();
        entityManager.clear();
        perform(get(base + "/records"), guardian).andExpect(jsonPath("$.data.items").isEmpty());
        perform(get(base + "/records/" + id), guardian).andExpect(status().isNotFound());
        perform(post(base + "/records/" + id + "/restore"), secondary)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.content").value("수정 내용"));
        assertThat(recipients.findById(recipient.getId()).orElseThrow().getLatestRecordAt())
                .isEqualTo(LocalDateTime.of(2026, 10, 14, 3, 0));
    }

    @Test
    void onlyGuardianCanPinAndWriteCareInfo() throws Exception {
        long id = create(worker, "기록", "2026-10-14T03:00:00Z");
        perform(patch(base + "/records/" + id + "/pin").content("{\"pinned\":true}"), worker)
                .andExpect(status().isForbidden());
        perform(patch(base + "/records/" + id + "/pin").content("{\"pinned\":true}"), secondary)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.pinned").value(true));
        perform(put(base + "/care-info/COMMUNICATION").content("{\"content\":\"눈을 맞추고 대화\"}"), worker)
                .andExpect(status().isForbidden());
        perform(put(base + "/care-info/COMMUNICATION").content("{\"content\":\"눈을 맞추고 대화\"}"), secondary)
                .andExpect(status().isOk());
        perform(get(base + "/care-info"), worker).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.categories.length()").value(6))
                .andExpect(jsonPath("$.data.pinnedRecords[0].id").value(id));
        perform(put(base + "/care-info/COMMUNICATION").content("{\"content\":\"\"}"), guardian)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.content").value(""));
    }

    @Test
    void unfilledCareInfoHasEmptyContentAndNullTimestamp() throws Exception {
        perform(get(base + "/care-info/EMERGENCY"), guardian).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").value(""))
                .andExpect(jsonPath("$.data.updatedAt").isEmpty());
    }

    @Test
    void cannotEditOtherWorkersRecordOrAccessOtherRecipient() throws Exception {
        long id = create(worker, "기록", "2026-10-14T03:00:00Z");
        perform(patch(base + "/records/" + id).content("{\"content\":\"변경\"}"), otherWorker)
                .andExpect(status().isForbidden());
        perform(delete(base + "/records/" + id), otherWorker).andExpect(status().isForbidden());
        perform(get(base + "/records/" + id), outsider).andExpect(status().isForbidden());
        guardians.save(CareGuardian.builder().careRecipientId(otherRecipient.getId()).guardianId(guardian.getId())
                .type(GuardianType.PRIMARY).status(GuardianStatus.ACTIVE).build());
        perform(get("/api/care-recipients/" + otherRecipient.getId() + "/records/" + id), guardian)
                .andExpect(status().isNotFound());
    }

    @Test
    void institutionCanReadButCannotCreateOrModify() throws Exception {
        long id = create(guardian, "기록", "2026-10-14T03:00:00Z");
        perform(get(base + "/records/" + id), institution).andExpect(status().isOk());
        perform(post(base + "/records").content(body("기록", "2026-10-14T03:00:00Z")), institution)
                .andExpect(status().isForbidden());
        perform(patch(base + "/records/" + id).content("{\"content\":\"변경\"}"), institution)
                .andExpect(status().isForbidden());
    }

    @Test
    void endedAssignmentRevokesReadAndWriteImmediately() throws Exception {
        long id = create(worker, "기록", "2026-10-14T03:00:00Z");
        assignment.end();
        perform(get(base + "/records"), worker).andExpect(status().isForbidden());
        perform(patch(base + "/records/" + id).content("{\"content\":\"변경\"}"), worker)
                .andExpect(status().isForbidden());
        perform(get(base + "/care-info"), worker).andExpect(status().isForbidden());
    }

    @Test
    void futureAndExpiredAssignmentsDoNotGrantAccess() throws Exception {
        assignment.end();
        assign(worker, LocalDate.of(2026, 10, 15), null, assignment.getOrganizationId());
        assign(worker, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 13), assignment.getOrganizationId());
        perform(get(base + "/records"), worker).andExpect(status().isForbidden());
    }

    @Test
    void revokedSecondaryGuardianCannotReadOrWrite() throws Exception {
        guardians.findAll().stream().filter(g -> g.getGuardianId().equals(secondary.getId()))
                .forEach(CareGuardian::revoke);
        perform(get(base + "/records"), secondary).andExpect(status().isForbidden());
        perform(put(base + "/care-info/HEALTH_MEDICATION").content("{\"content\":\"정보\"}"), secondary)
                .andExpect(status().isForbidden());
    }

    @Test
    void seoulDateFiltersAndPaginationUseStableDescendingOrder() throws Exception {
        create(guardian, "전날", "2026-10-13T14:59:59Z");
        create(guardian, "첫번째", "2026-10-13T15:00:00Z");
        long latest = create(guardian, "두번째", "2026-10-13T15:00:00Z");
        create(guardian, "다음날", "2026-10-14T15:00:00Z");
        perform(get(base + "/records?date=2026-10-14&pageSize=1"), guardian)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.items[0].id").value(latest))
                .andExpect(jsonPath("$.data.pagination.totalItems").value(2))
                .andExpect(jsonPath("$.data.pagination.totalPages").value(2));
        perform(get(base + "/records/today"), guardian).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
        perform(get(base + "/records?year=2026&month=10"), guardian)
                .andExpect(jsonPath("$.data.pagination.totalItems").value(4));
    }

    @Test
    void invalidFiltersAndPaginationAreRejected() throws Exception {
        for (String query : List.of("date=2026-10-14&year=2026&month=10", "year=2026", "month=10",
                "year=2026&month=13", "page=0", "pageSize=101", "pageSize=0")) {
            perform(get(base + "/records?" + query), guardian).andExpect(status().isBadRequest());
        }
    }

    @Test
    void validationRejectsBlankOversizeAndEmptyPatch() throws Exception {
        for (String content : List.of("   ", "가".repeat(501))) {
            perform(post(base + "/records").content(body(content, "2026-10-14T03:00:00Z")), guardian)
                    .andExpect(status().isUnprocessableEntity());
        }
        long id = create(guardian, "기록", "2026-10-14T03:00:00Z");
        perform(patch(base + "/records/" + id).content("{}"), guardian)
                .andExpect(status().isUnprocessableEntity());
        perform(patch(base + "/records/" + id + "/pin").content("{}"), guardian)
                .andExpect(status().isUnprocessableEntity());
        perform(put(base + "/care-info/EMERGENCY").content("{\"content\":\"" + "가".repeat(3001) + "\"}"), guardian)
                .andExpect(status().isUnprocessableEntity());
        perform(post(base + "/records").content(body("기록", "2026-10-14T03:00:00")), guardian)
                .andExpect(status().isBadRequest());
    }

    @Test
    void unsupportedMediaAndRecordRequestsAreNotSilentlyDiscarded() throws Exception {
        for (String extra : List.of("\"mediaIds\":[1]", "\"recordRequestId\":1")) {
            String json = body("기록", "2026-10-14T03:00:00Z");
            json = json.substring(0, json.length() - 1) + "," + extra + "}";
            perform(post(base + "/records").content(json), guardian).andExpect(status().isUnprocessableEntity());
        }
    }

    @Test
    void restoreExpiresAtThirtyDays() throws Exception {
        long id = create(guardian, "기록", "2026-10-14T03:00:00Z");
        perform(delete(base + "/records/" + id), guardian).andExpect(status().isOk());
        given(clock.instant()).willReturn(NOW.plus(Duration.ofDays(30)).plusSeconds(1));
        perform(post(base + "/records/" + id + "/restore"), guardian).andExpect(status().isConflict());
    }

    @Test
    void restoringAnActiveRecordIsConflict() throws Exception {
        long id = create(guardian, "기록", "2026-10-14T03:00:00Z");
        perform(post(base + "/records/" + id + "/restore"), guardian).andExpect(status().isConflict());
    }

    @Test
    void realJwtAuthenticatesRecordApiAndAnonymousAccessIsRejected() throws Exception {
        mvc.perform(get(base + "/records")).andExpect(status().is4xxClientError());
        String token = jwt.generateAccessToken(guardian.getId(), "GUARDIAN");
        mvc.perform(get(base + "/records").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void pinOnCreateRequiresGuardianAndDeletedPinsDisappear() throws Exception {
        String json = body("기록", "2026-10-14T03:00:00Z");
        json = json.substring(0, json.length() - 1) + ",\"pinned\":true}";
        perform(post(base + "/records").content(json), worker).andExpect(status().isForbidden());
        String result = perform(post(base + "/records").content(json), secondary)
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.pinned").value(true))
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(result, "$.data.id")).longValue();
        perform(delete(base + "/records/" + id), guardian).andExpect(status().isOk());
        perform(get(base + "/care-info"), guardian).andExpect(jsonPath("$.data.pinnedRecords").isEmpty());
        perform(patch(base + "/records/" + id + "/pin").content("{\"pinned\":false}"), guardian)
                .andExpect(status().isNotFound());
    }

    @Test
    void restoreSucceedsJustBeforeDeadlineButNotAtDeadline() throws Exception {
        long first = create(guardian, "기록1", "2026-10-14T03:00:00Z");
        long second = create(guardian, "기록2", "2026-10-14T03:00:00Z");
        perform(delete(base + "/records/" + first), guardian).andExpect(status().isOk());
        perform(delete(base + "/records/" + second), guardian).andExpect(status().isOk());
        given(clock.instant()).willReturn(NOW.plus(Duration.ofDays(30)).minusSeconds(1));
        perform(post(base + "/records/" + first + "/restore"), guardian).andExpect(status().isOk());
        given(clock.instant()).willReturn(NOW.plus(Duration.ofDays(30)));
        perform(post(base + "/records/" + second + "/restore"), guardian).andExpect(status().isConflict());
    }

    @Test
    void revisionsArePersistedInOrderAndPaginated() throws Exception {
        long id = create(worker, "버전1", "2026-10-14T03:00:00Z");
        perform(patch(base + "/records/" + id).content("{\"content\":\"버전2\"}"), worker)
                .andExpect(status().isOk());
        entityManager.flush();
        entityManager.clear();
        perform(patch(base + "/records/" + id).content("{\"category\":\"MEAL\"}"), guardian)
                .andExpect(status().isOk());
        entityManager.flush();
        entityManager.clear();
        perform(get(base + "/records/" + id + "/revisions?pageSize=1"), guardian)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.items[0].revision").value(2))
                .andExpect(jsonPath("$.data.items[0].content").value("버전2"))
                .andExpect(jsonPath("$.data.items[0].category").value("HEALTH"))
                .andExpect(jsonPath("$.data.pagination.totalItems").value(2));
        perform(get(base + "/records/" + id + "/revisions?page=2&pageSize=1"), guardian)
                .andExpect(jsonPath("$.data.items[0].content").value("버전1"));
        perform(get(base + "/records/" + id + "/revisions?pageSize=101"), guardian)
                .andExpect(status().isBadRequest());
    }

    @Test
    void careInfoUpsertPersistsSingleRowAndSupportsAllSixCategories() throws Exception {
        for (String category : List.of("COMMUNICATION", "PREFERENCE", "LIFESTYLE", "HEALTH_MEDICATION", "PRECAUTION", "EMERGENCY")) {
            perform(put(base + "/care-info/" + category).content("{\"content\":\"초기\"}"), guardian)
                    .andExpect(status().isOk());
            entityManager.flush();
            entityManager.clear();
            perform(put(base + "/care-info/" + category).content("{\"content\":\"수정\"}"), secondary)
                    .andExpect(status().isOk());
            entityManager.flush();
            entityManager.clear();
            perform(get(base + "/care-info/" + category), worker)
                    .andExpect(jsonPath("$.data.content").value("수정"))
                    .andExpect(jsonPath("$.data.updatedAt").value("2026-10-14T03:00:00Z"));
        }
        Long count = entityManager.createQuery("select count(i) from CareInfo i where i.careRecipientId = :id", Long.class)
                .setParameter("id", recipient.getId()).getSingleResult();
        assertThat(count).isEqualTo(6L);
        perform(get(base + "/care-info/UNKNOWN"), guardian).andExpect(status().isBadRequest());
    }

    @Test
    void trimmedMaxContentIsAcceptedAndBadPatchDoesNotCreateRevision() throws Exception {
        long id = create(guardian, "  " + "가".repeat(500) + "  ", "2026-10-14T03:00:00Z");
        perform(patch(base + "/records/" + id).content("{\"content\":\"   \"}"), guardian)
                .andExpect(status().isUnprocessableEntity());
        perform(patch(base + "/records/" + id).content("{\"mediaIds\":[1]}"), guardian)
                .andExpect(status().isUnprocessableEntity());
        perform(get(base + "/records/" + id + "/revisions"), guardian)
                .andExpect(jsonPath("$.data.items").isEmpty());
    }

    private long create(User user, String content, String time) throws Exception {
        String json = perform(post(base + "/records").content(body(content, time)), user)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(json, "$.data.id")).longValue();
    }

    private String body(String content, String time) {
        return "{\"content\":\"" + content + "\",\"category\":\"HEALTH\",\"recordedAt\":\"" + time + "\"}";
    }

    private ResultActions perform(MockHttpServletRequestBuilder request, User user) throws Exception {
        return mvc.perform(request.contentType(MediaType.APPLICATION_JSON).with(authentication(
                new UsernamePasswordAuthenticationToken(user.getId(), null, List.of()))));
    }

    private User user(String name, UserRole role) {
        return users.save(User.builder().name(name).email(name + "@test.invalid")
                .publicCode("P-" + name.substring(0, Math.min(name.length(), 8))).role(role).build());
    }

    private CareRecipient recipient(String number) {
        return recipients.save(CareRecipient.builder().name("당사자").careRecipientNumber(number)
                .birthDate(LocalDate.of(2000, 1, 1)).gender(Gender.MALE).build());
    }

    private CareAssignment assign(User worker, LocalDate start, LocalDate end, Long orgId) {
        return assignments.save(CareAssignment.builder().careRecipientId(recipient.getId())
                .supportWorkerId(worker.getId()).organizationId(orgId).startDate(start).endDate(end)
                .idempotencyKey(java.util.UUID.randomUUID().toString()).build());
    }
}
