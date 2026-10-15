package com.project.backend.record.service;

import com.project.backend.care.entity.AccessLogAction;
import com.project.backend.care.entity.AccessLogResourceType;
import com.project.backend.care.service.AccessLogService;
import com.project.backend.notification.service.NotificationService;
import com.project.backend.record.dto.CreateRecordSuggestionRequest;
import com.project.backend.record.entity.DailyRecord;
import com.project.backend.record.entity.RecordCategory;
import com.project.backend.record.entity.RecordSuggestion;
import com.project.backend.record.repository.DailyRecordRepository;
import com.project.backend.record.repository.RecordRevisionRepository;
import com.project.backend.record.repository.RecordSuggestionRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class RecordSuggestionServiceTest {

    @Mock RecordSuggestionRepository suggestions;
    @Mock NotificationService notifications;
    @Mock DailyRecordRepository records;
    @Mock RecordRevisionRepository revisions;
    @Mock UserRepository users;
    @Mock RecordAccessService access;
    @Mock Clock clock;
    @Mock AccessLogService accessLogService;

    @InjectMocks RecordSuggestionService suggestionService;

    @Test
    void create_호출시_SUGGESTION_RECORD_로그_저장() {
        given(clock.instant()).willReturn(Instant.parse("2026-10-15T00:00:00Z"));
        DailyRecord record = dailyRecord(200L, 1L, 100L);
        given(records.findByIdAndCareRecipientId(200L, 100L)).willReturn(Optional.of(record));
        RecordSuggestion suggestion = new RecordSuggestion(
                record, 2L, "제안 내용", RecordCategory.COMMUNICATION, "이유", Instant.parse("2026-10-15T00:00:00Z"));
        ReflectionTestUtils.setField(suggestion, "id", 10L);
        given(suggestions.save(any())).willReturn(suggestion);
        given(users.findById(2L)).willReturn(Optional.of(user(2L)));

        suggestionService.create(2L, 100L, 200L,
                new CreateRecordSuggestionRequest("제안 내용", RecordCategory.COMMUNICATION, "이유"));

        verify(accessLogService).log(2L, 100L, AccessLogAction.SUGGESTION, AccessLogResourceType.RECORD, 200L);
    }

    private DailyRecord dailyRecord(Long id, Long authorId, Long careRecipientId) {
        DailyRecord r = DailyRecord.builder()
                .careRecipientId(careRecipientId).authorId(authorId)
                .content("테스트 내용").category(RecordCategory.COMMUNICATION)
                .recordedAt(Instant.parse("2026-10-15T00:00:00Z"))
                .pinned(false).now(Instant.parse("2026-10-15T00:00:00Z"))
                .build();
        ReflectionTestUtils.setField(r, "id", id);
        return r;
    }

    private User user(Long id) {
        User u = User.builder().name("지원사").email("w@test.com").publicCode("W-X")
                .role(UserRole.SUPPORT_WORKER).build();
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }
}
