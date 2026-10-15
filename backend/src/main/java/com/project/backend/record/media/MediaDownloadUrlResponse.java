package com.project.backend.record.media;

import java.time.Instant;

public record MediaDownloadUrlResponse(String url, Instant expiresAt) { }
