package com.project.backend.record.dto;

import com.project.backend.record.entity.RecordCategory;
import com.project.backend.record.entity.RecordSuggestion;
import com.project.backend.record.entity.RecordSuggestionStatus;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import java.time.Instant;

public record RecordSuggestionResponse(Long id, Long recordId, Original original, Proposed proposed,
                                       String reason, Author suggestedBy, RecordSuggestionStatus status,
                                       Instant createdAt) {
    public record Original(String content, RecordCategory category) { }
    public record Proposed(String content, RecordCategory category) { }
    public record Author(Long id, String name, UserRole role) { }

    public static RecordSuggestionResponse of(RecordSuggestion suggestion, User author) {
        return new RecordSuggestionResponse(suggestion.getId(), suggestion.getRecordId(),
                new Original(suggestion.getOriginalContent(), suggestion.getOriginalCategory()),
                new Proposed(suggestion.getProposedContent(), suggestion.getProposedCategory()), suggestion.getReason(),
                new Author(author.getId(), author.getName(), author.getRole()), suggestion.getStatus(),
                suggestion.getCreatedAt());
    }
}
