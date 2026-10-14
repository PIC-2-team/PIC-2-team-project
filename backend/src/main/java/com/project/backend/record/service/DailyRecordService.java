package com.project.backend.record.service;

import com.project.backend.care.entity.CareRecipient;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.common.response.PaginatedData;
import com.project.backend.record.dto.*;
import com.project.backend.record.entity.*;
import com.project.backend.record.repository.*;
import com.project.backend.user.entity.User;
import com.project.backend.user.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class DailyRecordService {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final Duration RESTORE_WINDOW = Duration.ofDays(30);
    private final DailyRecordRepository records;
    private final RecordRevisionRepository revisions;
    private final CareRecipientRepository recipients;
    private final UserRepository users;
    private final RecordAccessService access;
    private final Clock clock;

    public RecordResponse create(Long userId, Long recipientId, CreateRecordRequest request) {
        access.verifyCreate(userId, recipientId);
        boolean pinned = Boolean.TRUE.equals(request.pinned());
        if (pinned) access.verifyGuardian(userId, recipientId);
        rejectPendingFeatures(request.mediaIds(), request.recordRequestId());
        CareRecipient recipient = lockRecipient(recipientId);
        DailyRecord record = records.save(DailyRecord.builder().careRecipientId(recipientId).authorId(userId)
                .content(request.content()).category(request.category()).recordedAt(request.recordedAt().toInstant())
                .pinned(pinned).now(clock.instant()).build());
        recipient.updateLatestRecordAt(LocalDateTime.ofInstant(record.getRecordedAt(), ZoneOffset.UTC));
        return response(record);
    }

    @Transactional(readOnly = true)
    public RecordResponse get(Long userId, Long recipientId, Long recordId) {
        access.verifyRead(userId, recipientId);
        return response(active(find(recipientId, recordId, false)));
    }

    public RecordResponse update(Long userId, Long recipientId, Long recordId, UpdateRecordRequest request) {
        access.verifyRead(userId, recipientId);
        DailyRecord record = active(find(recipientId, recordId, true));
        access.verifyEdit(userId, recipientId, record.getAuthorId());
        if (request.content() == null && request.category() == null && request.recordedAt() == null && request.mediaIds() == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "수정할 필드가 필요합니다.");
        }
        rejectPendingFeatures(request.mediaIds(), null);
        Instant now = clock.instant();
        revisions.save(new RecordRevision(record, userId, revisions.latestRevision(recordId) + 1, now));
        record.update(request.content(), request.category(),
                request.recordedAt() == null ? null : request.recordedAt().toInstant(), now);
        lockRecipient(recipientId).updateLatestRecordAt(LocalDateTime.ofInstant(record.getRecordedAt(), ZoneOffset.UTC));
        return response(record);
    }

    public DeleteRecordResponse delete(Long userId, Long recipientId, Long recordId) {
        access.verifyRead(userId, recipientId);
        DailyRecord record = active(find(recipientId, recordId, true));
        access.verifyEdit(userId, recipientId, record.getAuthorId());
        record.delete(clock.instant());
        return new DeleteRecordResponse(record.getDeletedAt(), record.getDeletedAt().plus(RESTORE_WINDOW));
    }

    public RecordResponse restore(Long userId, Long recipientId, Long recordId) {
        access.verifyRead(userId, recipientId);
        DailyRecord record = find(recipientId, recordId, true);
        access.verifyEdit(userId, recipientId, record.getAuthorId());
        Instant now = clock.instant();
        if (record.getDeletedAt() == null || !now.isBefore(record.getDeletedAt().plus(RESTORE_WINDOW))) {
            throw new ApiException(HttpStatus.CONFLICT, "RECORD_NOT_RESTORABLE", "복구 가능한 삭제 기록이 아닙니다.");
        }
        record.restore(now);
        return response(record);
    }

    public RecordResponse pin(Long userId, Long recipientId, Long recordId, boolean pinned) {
        access.verifyGuardian(userId, recipientId);
        DailyRecord record = active(find(recipientId, recordId, true));
        record.pin(pinned, clock.instant());
        return response(record);
    }

    @Transactional(readOnly = true)
    public PaginatedData<RecordResponse> list(Long userId, Long recipientId, LocalDate date,
                                               Integer year, Integer month, int page, int pageSize) {
        access.verifyRead(userId, recipientId);
        Pageable pageable = pageable(page, pageSize, "recordedAt");
        Instant[] range = range(date, year, month);
        Page<DailyRecord> result = records.findAll(filter(recipientId, range), pageable);
        return new PaginatedData<>(responses(result.getContent()), pagination(result));
    }

    @Transactional(readOnly = true)
    public List<RecordResponse> today(Long userId, Long recipientId) {
        access.verifyRead(userId, recipientId);
        LocalDate date = clock.instant().atZone(SEOUL).toLocalDate();
        return responses(records.findAll(filter(recipientId, range(date, null, null)),
                Sort.by(Sort.Direction.DESC, "recordedAt", "id")));
    }

    @Transactional(readOnly = true)
    public List<RecordResponse> pinned(Long userId, Long recipientId) {
        access.verifyRead(userId, recipientId);
        return responses(records.findByCareRecipientIdAndPinnedTrueAndDeletedAtIsNullOrderByRecordedAtDescIdDesc(recipientId));
    }

    @Transactional(readOnly = true)
    public PaginatedData<RevisionResponse> revisions(Long userId, Long recipientId, Long recordId, int page, int pageSize) {
        access.verifyRead(userId, recipientId);
        active(find(recipientId, recordId, false));
        Page<RecordRevision> result = revisions.findByRecordId(recordId, pageable(page, pageSize, "revision"));
        Map<Long, User> authors = authors(result.stream().map(RecordRevision::getChangedById).toList());
        return new PaginatedData<>(result.stream().map(r -> RevisionResponse.of(r, authors.get(r.getChangedById()))).toList(),
                pagination(result));
    }

    private DailyRecord find(Long recipientId, Long id, boolean lock) {
        return (lock ? records.findForUpdate(id, recipientId) : records.findByIdAndCareRecipientId(id, recipientId))
                .orElseThrow(this::notFound);
    }

    private DailyRecord active(DailyRecord record) {
        if (record.getDeletedAt() != null) throw notFound();
        return record;
    }

    private ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "RECORD_NOT_FOUND", "기록을 찾을 수 없습니다.");
    }

    private CareRecipient lockRecipient(Long id) {
        return recipients.findForUpdate(id).orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND, "CARE_RECIPIENT_NOT_FOUND", "당사자를 찾을 수 없습니다."));
    }

    private RecordResponse response(DailyRecord record) {
        return RecordResponse.of(record, users.findById(record.getAuthorId()).orElseThrow());
    }

    private List<RecordResponse> responses(List<DailyRecord> records) {
        Map<Long, User> authors = authors(records.stream().map(DailyRecord::getAuthorId).toList());
        return records.stream().map(r -> RecordResponse.of(r, authors.get(r.getAuthorId()))).toList();
    }

    private Map<Long, User> authors(List<Long> ids) {
        return users.findAllById(new HashSet<>(ids)).stream().collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private void rejectPendingFeatures(List<Long> mediaIds, Long recordRequestId) {
        if ((mediaIds != null && !mediaIds.isEmpty()) || recordRequestId != null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "UNSUPPORTED_RECORD_LINK", "미디어 및 기록 요청 연결은 아직 지원하지 않습니다.");
        }
    }

    private Pageable pageable(int page, int size, String sortField) {
        if (page < 1 || size < 1 || size > 100) throw invalidQuery();
        return PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, sortField, "id"));
    }

    private PaginatedData.Pagination pagination(Page<?> page) {
        return new PaginatedData.Pagination(page.getNumber() + 1, page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    private Instant[] range(LocalDate date, Integer year, Integer month) {
        if ((date != null && (year != null || month != null)) || (year == null) != (month == null)) throw invalidQuery();
        try {
            if (date != null) return new Instant[]{date.atStartOfDay(SEOUL).toInstant(), date.plusDays(1).atStartOfDay(SEOUL).toInstant()};
            if (year != null) {
                if (year < 1 || year > 9999) throw invalidQuery();
                LocalDate start = YearMonth.of(year, month).atDay(1);
                return new Instant[]{start.atStartOfDay(SEOUL).toInstant(), start.plusMonths(1).atStartOfDay(SEOUL).toInstant()};
            }
            return null;
        } catch (DateTimeException e) {
            throw invalidQuery();
        }
    }

    private ApiException invalidQuery() {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "날짜 또는 페이지 조건이 올바르지 않습니다.");
    }

    private Specification<DailyRecord> filter(Long recipientId, Instant[] range) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("careRecipientId"), recipientId));
            predicates.add(cb.isNull(root.get("deletedAt")));
            if (range != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("recordedAt"), range[0]));
                predicates.add(cb.lessThan(root.get("recordedAt"), range[1]));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
