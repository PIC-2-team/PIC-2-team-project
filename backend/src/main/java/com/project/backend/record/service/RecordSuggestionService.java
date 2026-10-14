package com.project.backend.record.service;

import com.project.backend.common.exception.ApiException;
import com.project.backend.common.response.PaginatedData;
import com.project.backend.record.dto.CreateRecordSuggestionRequest;
import com.project.backend.record.dto.RecordSuggestionDecisionRequest;
import com.project.backend.record.dto.RecordSuggestionResponse;
import com.project.backend.record.entity.DailyRecord;
import com.project.backend.record.entity.RecordRevision;
import com.project.backend.record.entity.RecordSuggestion;
import com.project.backend.record.entity.RecordSuggestionStatus;
import com.project.backend.record.repository.DailyRecordRepository;
import com.project.backend.record.repository.RecordRevisionRepository;
import com.project.backend.record.repository.RecordSuggestionRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RecordSuggestionService {
    private final RecordSuggestionRepository suggestions;
    private final DailyRecordRepository records;
    private final RecordRevisionRepository revisions;
    private final UserRepository users;
    private final RecordAccessService access;
    private final Clock clock;

    public RecordSuggestionResponse create(Long userId, Long careRecipientId, Long recordId,
                                           CreateRecordSuggestionRequest request) {
        access.verifySuggestionCreate(userId, careRecipientId);
        DailyRecord record = active(records.findByIdAndCareRecipientId(recordId, careRecipientId)
                .orElseThrow(this::recordNotFound));
        RecordSuggestion suggestion = suggestions.save(new RecordSuggestion(record, userId, request.content(),
                request.category(), request.reason(), clock.instant()));
        return response(suggestion);
    }

    @Transactional(readOnly = true)
    public PaginatedData<RecordSuggestionResponse> list(Long userId, Long careRecipientId,
                                                         RecordSuggestionStatus status, int page, int pageSize) {
        access.verifyGuardian(userId, careRecipientId);
        Pageable pageable = pageable(page, pageSize);
        Page<RecordSuggestion> result = suggestions.findByCareRecipientIdAndStatus(careRecipientId, status, pageable);
        Map<Long, User> authors = users.findAllById(result.stream().map(RecordSuggestion::getSuggestedById)
                .collect(Collectors.toSet())).stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return new PaginatedData<>(result.stream().map(item -> RecordSuggestionResponse.of(item,
                authors.get(item.getSuggestedById()))).toList(), pagination(result));
    }

    public RecordSuggestionResponse decide(Long userId, Long careRecipientId, Long suggestionId,
                                           RecordSuggestionDecisionRequest.Decision decision) {
        access.verifyGuardian(userId, careRecipientId);
        RecordSuggestion suggestion = suggestions.findForUpdate(suggestionId, careRecipientId)
                .orElseThrow(this::suggestionNotFound);
        if (suggestion.getStatus() != RecordSuggestionStatus.PENDING) throw alreadyDecided();
        DailyRecord record = active(records.findForUpdate(suggestion.getRecordId(), careRecipientId)
                .orElseThrow(this::recordNotFound));
        if (decision == RecordSuggestionDecisionRequest.Decision.APPROVE
                && (!record.getUpdatedAt().equals(suggestion.getOriginalUpdatedAt())
                || !record.getContent().equals(suggestion.getOriginalContent())
                || record.getCategory() != suggestion.getOriginalCategory())) throw staleSuggestion();

        if (decision == RecordSuggestionDecisionRequest.Decision.APPROVE) {
            Instant now = clock.instant();
            revisions.save(new RecordRevision(record, userId, revisions.latestRevision(record.getId()) + 1, now));
            record.update(suggestion.getProposedContent(), suggestion.getProposedCategory(), null, now);
            suggestion.decide(RecordSuggestionStatus.APPROVED);
        } else {
            suggestion.decide(RecordSuggestionStatus.REJECTED);
        }
        return response(suggestion);
    }

    private RecordSuggestionResponse response(RecordSuggestion suggestion) {
        User author = users.findById(suggestion.getSuggestedById()).orElseThrow(this::suggestionNotFound);
        return RecordSuggestionResponse.of(suggestion, author);
    }

    private DailyRecord active(DailyRecord record) {
        if (record.getDeletedAt() != null) throw recordNotFound();
        return record;
    }

    private Pageable pageable(int page, int pageSize) {
        if (page < 1 || pageSize < 1 || pageSize > 100) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "페이지 조건이 올바르지 않습니다.");
        }
        return PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
    }

    private PaginatedData.Pagination pagination(Page<?> page) {
        return new PaginatedData.Pagination(page.getNumber() + 1, page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    private ApiException recordNotFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "RECORD_NOT_FOUND", "기록을 찾을 수 없습니다.");
    }

    private ApiException suggestionNotFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "SUGGESTION_NOT_FOUND", "수정 제안을 찾을 수 없습니다.");
    }

    private ApiException alreadyDecided() {
        return new ApiException(HttpStatus.CONFLICT, "SUGGESTION_ALREADY_DECIDED", "이미 처리된 수정 제안입니다.");
    }

    private ApiException staleSuggestion() {
        return new ApiException(HttpStatus.CONFLICT, "SUGGESTION_STALE", "원본 기록이 변경되어 수정 제안을 처리할 수 없습니다.");
    }
}
