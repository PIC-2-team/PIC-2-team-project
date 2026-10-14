package com.project.backend.record.dto;
import java.time.Instant;
public record DeleteRecordResponse(Instant deletedAt, Instant restoreUntil) { }
