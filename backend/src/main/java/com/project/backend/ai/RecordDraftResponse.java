package com.project.backend.ai;

import com.project.backend.record.entity.RecordCategory;

public record RecordDraftResponse(String transcript, String content, RecordCategory category) { }
