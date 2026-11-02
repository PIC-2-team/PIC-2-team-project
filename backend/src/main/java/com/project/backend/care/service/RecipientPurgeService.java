package com.project.backend.care.service;

import com.project.backend.record.media.RecordMedia;
import com.project.backend.record.media.RecordMediaRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

import java.time.LocalDateTime;
import java.util.List;

/** 삭제 유예(기본 30일)가 지난 당사자와 딸린 데이터를 영구 삭제한다 (ADR-014). */
@Service
@RequiredArgsConstructor
public class RecipientPurgeService {
    private static final Logger log = LoggerFactory.getLogger(RecipientPurgeService.class);

    private final EntityManager em;
    private final RecordMediaRepository mediaRepository;
    private final S3Client s3;
    private final TransactionTemplate tx;

    @Value("${cloud.aws.s3.bucket:}")
    private String bucket;

    @Value("${withdrawal.purge-days:30}")
    private int purgeDays;

    public int purgeExpired(LocalDateTime now) {
        LocalDateTime cutoff = now.minusDays(purgeDays);
        // @SQLRestriction이 삭제된 당사자를 숨기므로 네이티브 쿼리로 조회한다
        @SuppressWarnings("unchecked")
        List<Number> ids = em.createNativeQuery(
                        "select id from care_recipient where deleted_at is not null and deleted_at < :cutoff")
                .setParameter("cutoff", cutoff).getResultList();
        int purged = 0;
        for (Number id : ids) {
            try {
                purge(id.longValue());
                purged++;
            } catch (RuntimeException e) {
                // 한 명이 실패해도 나머지를 계속 처리하고, 남은 당사자는 다음 실행에서 다시 시도한다
                log.error("당사자 영구 삭제 실패 recipientId={}", id, e);
            }
        }
        return purged;
    }

    private void purge(Long recipientId) {
        // 스토리지를 먼저 지운다. 삭제는 반복해도 안전하고, 실패하면 DB를 남겨 키를 잃지 않는다
        for (RecordMedia media : mediaRepository.findAllByCareRecipientIdOrderByCreatedAtDesc(recipientId)) {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(media.getS3Key()).build());
        }
        tx.executeWithoutResult(status -> deleteRows(recipientId));
    }

    // 접근 이력(access_log)은 감사 목적으로 보존한다 (ADR-014)
    private void deleteRows(Long id) {
        String ownRecords = "(select d.id from DailyRecord d where d.careRecipientId = :id)";
        String ownMedia = "(select m.id from RecordMedia m where m.careRecipientId = :id)";
        run("delete from RecordRevision r where r.recordId in " + ownRecords, id);
        run("delete from RecordMediaLink l where l.recordId in " + ownRecords
                + " or l.mediaId in " + ownMedia, id);
        for (String entity : List.of("DailyRecord", "CareInfo", "RecordMedia", "Schedule", "InformationRequest",
                "CareRecipientRoutine", "CareRecipientDisability", "CareAssignment", "CareGuardian",
                "OrganizationRecipientLink")) {
            run("delete from " + entity + " e where e.careRecipientId = :id", id);
        }
        em.createNativeQuery("delete from care_recipient where id = :id").setParameter("id", id).executeUpdate();
    }

    private void run(String jpql, Long id) {
        em.createQuery(jpql).setParameter("id", id).executeUpdate();
    }
}
