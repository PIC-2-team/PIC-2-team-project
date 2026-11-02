package com.project.backend.care.service;

import com.project.backend.care.entity.*;
import com.project.backend.care.repository.*;
import com.project.backend.information.entity.InformationRequest;
import com.project.backend.information.repository.InformationRequestRepository;
import com.project.backend.organization.entity.OrganizationRecipientLink;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.record.entity.*;
import com.project.backend.record.media.*;
import com.project.backend.record.repository.CareInfoRepository;
import com.project.backend.record.repository.DailyRecordRepository;
import com.project.backend.record.repository.RecordRevisionRepository;
import com.project.backend.schedule.entity.Schedule;
import com.project.backend.schedule.repository.ScheduleRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@SpringBootTest
@Transactional
class RecipientPurgeServiceTest {
    static final LocalDateTime NOW = LocalDateTime.of(2026, 12, 10, 4, 30);
    static final Instant INSTANT = Instant.parse("2026-11-01T00:00:00Z");

    @Autowired RecipientPurgeService purge;
    @Autowired EntityManager em;
    @Autowired CareRecipientRepository recipients;
    @Autowired CareGuardianRepository guardians;
    @Autowired CareAssignmentRepository assignments;
    @Autowired CareRecipientRoutineRepository routines;
    @Autowired CareRecipientDisabilityRepository disabilities;
    @Autowired AccessLogRepository accessLogs;
    @Autowired OrganizationRecipientLinkRepository links;
    @Autowired DailyRecordRepository records;
    @Autowired RecordRevisionRepository revisions;
    @Autowired CareInfoRepository careInfos;
    @Autowired RecordMediaRepository media;
    @Autowired RecordMediaLinkRepository mediaLinks;
    @Autowired ScheduleRepository schedules;
    @Autowired InformationRequestRepository informationRequests;
    @MockitoBean S3Client s3;
    @MockitoBean S3Presigner presigner;

    @Test
    void purgesRecipientsPastGracePeriodWithAllTheirData() {
        CareRecipient old = deletedRecipient("R-OLD", NOW.minusDays(31));
        Long id = old.getId();
        DailyRecord record = records.save(DailyRecord.builder().careRecipientId(id).authorId(1L).content("기록")
                .category(RecordCategory.OTHER).recordedAt(INSTANT).now(INSTANT).build());
        revisions.save(new RecordRevision(record, 1L, 1, INSTANT));
        RecordMedia file = media.save(new RecordMedia(id, 1L, "a.png", "image/png", 10, "records/old/a.png", INSTANT));
        mediaLinks.save(new RecordMediaLink(record.getId(), file.getId()));
        CareInfo info = new CareInfo(id, CareInfoCategory.COMMUNICATION);
        info.update("내용", INSTANT);
        careInfos.save(info);
        schedules.save(Schedule.builder().careRecipientId(id).createdById(1L).title("일정").scheduledAt(INSTANT).now(INSTANT).build());
        informationRequests.save(new InformationRequest(id, 1L, 1L, "요청", INSTANT));
        routines.save(CareRecipientRoutine.builder().careRecipientId(id).routineTime(LocalTime.of(8, 0)).title("기상").build());
        disabilities.save(CareRecipientDisability.builder().careRecipientId(id).disabilityType(DisabilityType.AUTISM).build());
        assignments.save(CareAssignment.builder().careRecipientId(id).supportWorkerId(2L).organizationId(1L)
                .startDate(LocalDate.of(2026, 10, 1)).idempotencyKey("k1").build());
        guardians.save(CareGuardian.builder().careRecipientId(id).guardianId(3L).type(GuardianType.PRIMARY)
                .status(GuardianStatus.REVOKED).build());
        links.save(OrganizationRecipientLink.builder().organizationId(1L).careRecipientId(id).requestedById(3L).build());
        accessLogs.save(AccessLog.builder().actorId(3L).careRecipientId(id).action(AccessLogAction.VIEW)
                .resourceType(AccessLogResourceType.PROFILE).resourceId(id).build());

        int purged = purge.purgeExpired(NOW);

        em.flush();
        em.clear();
        assertThat(purged).isEqualTo(1);
        assertThat(count("care_recipient", id)).isZero();
        for (String table : List.of("daily_record", "care_info", "record_media", "schedule", "information_request",
                "care_recipient_routine", "care_recipient_disability", "care_assignment", "care_guardian",
                "organization_recipient_link")) {
            assertThat(count(table, id)).as(table).isZero();
        }
        assertThat(((Number) em.createNativeQuery("select count(*) from record_revision").getSingleResult()).intValue()).isZero();
        assertThat(((Number) em.createNativeQuery("select count(*) from record_media_link").getSingleResult()).intValue()).isZero();
        assertThat(count("access_log", id)).as("접근 이력은 감사 목적으로 보존").isEqualTo(1);
        ArgumentCaptor<DeleteObjectRequest> captor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3).deleteObject(captor.capture());
        assertThat(captor.getValue().key()).isEqualTo("records/old/a.png");
    }

    @Test
    void keepsRecipientsInsideGracePeriodAndLiveOnes() {
        CareRecipient recent = deletedRecipient("R-RECENT", NOW.minusDays(29));
        CareRecipient live = recipients.save(CareRecipient.builder().name("당사자").careRecipientNumber("R-LIVE")
                .birthDate(LocalDate.of(2000, 1, 1)).gender(Gender.MALE).build());
        media.save(new RecordMedia(recent.getId(), 1L, "a.png", "image/png", 10, "records/recent/a.png", INSTANT));

        int purged = purge.purgeExpired(NOW);

        em.flush();
        em.clear();
        assertThat(purged).isZero();
        assertThat(count("care_recipient", recent.getId())).isEqualTo(1);
        assertThat(recipients.findById(live.getId())).isPresent();
        verify(s3, times(0)).deleteObject(any(DeleteObjectRequest.class));
    }

    @Test
    void keepsRecipientWhenStorageDeletionFailsAndContinuesWithOthers() {
        CareRecipient failing = deletedRecipient("R-FAIL", NOW.minusDays(40));
        CareRecipient ok = deletedRecipient("R-OK", NOW.minusDays(40));
        media.save(new RecordMedia(failing.getId(), 1L, "a.png", "image/png", 10, "records/fail/a.png", INSTANT));
        given(s3.deleteObject(any(DeleteObjectRequest.class))).willThrow(S3Exception.builder().message("down").build());

        int purged = purge.purgeExpired(NOW);

        em.flush();
        em.clear();
        assertThat(purged).isEqualTo(1);
        assertThat(count("care_recipient", failing.getId())).as("S3 실패 시 DB를 남겨 다음 실행에서 재시도").isEqualTo(1);
        assertThat(count("record_media", failing.getId())).isEqualTo(1);
        assertThat(count("care_recipient", ok.getId())).isZero();
    }

    @Test
    void doesNotPurgeRecipientThatIsNoLongerDeletedOrStillInsideGracePeriod() {
        CareRecipient live = recipients.save(CareRecipient.builder().name("당사자").careRecipientNumber("R-RESTORED")
                .birthDate(LocalDate.of(2000, 1, 1)).gender(Gender.MALE).build());
        CareRecipient recent = deletedRecipient("R-RECENT2", NOW.minusDays(5));
        media.save(new RecordMedia(live.getId(), 1L, "a.png", "image/png", 10, "records/live/a.png", INSTANT));

        assertThat(purge.purge(live.getId(), NOW.minusDays(30))).isFalse();
        assertThat(purge.purge(recent.getId(), NOW.minusDays(30))).isFalse();

        em.flush();
        em.clear();
        assertThat(count("care_recipient", live.getId())).isEqualTo(1);
        assertThat(count("record_media", live.getId())).isEqualTo(1);
        verify(s3, times(0)).deleteObject(any(DeleteObjectRequest.class));
    }

    @Test
    void everyEntityHoldingACareRecipientIdIsPurgedOrExplicitlyRetained() {
        List<String> handled = new java.util.ArrayList<>(RecipientPurgeService.PURGED_ENTITIES);
        handled.addAll(RecipientPurgeService.RETAINED_ENTITIES);
        List<String> holders = em.getMetamodel().getEntities().stream()
                .filter(e -> e.getAttributes().stream().anyMatch(a -> a.getName().equals("careRecipientId")))
                .map(jakarta.persistence.metamodel.EntityType::getName).toList();

        assertThat(handled).containsAll(holders);
    }

    @Test
    void rejectsPurgeDaysBelowOne() {
        ReflectionTestUtils.setField(purge, "purgeDays", 0);
        try {
            org.assertj.core.api.Assertions.assertThatThrownBy(purge::validateConfiguration)
                    .isInstanceOf(IllegalStateException.class);
        } finally {
            ReflectionTestUtils.setField(purge, "purgeDays", 30);
        }
    }

    private CareRecipient deletedRecipient(String number, LocalDateTime deletedAt) {
        CareRecipient r = recipients.save(CareRecipient.builder().name("당사자").careRecipientNumber(number)
                .birthDate(LocalDate.of(2000, 1, 1)).gender(Gender.MALE).build());
        ReflectionTestUtils.setField(r, "deletedAt", deletedAt);
        em.flush();
        return r;
    }

    private int count(String table, Long recipientId) {
        String column = table.equals("care_recipient") ? "id" : "care_recipient_id";
        return ((Number) em.createNativeQuery("select count(*) from " + table + " where " + column + " = :id")
                .setParameter("id", recipientId).getSingleResult()).intValue();
    }
}
