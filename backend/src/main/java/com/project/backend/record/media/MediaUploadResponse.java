package com.project.backend.record.media;

public record MediaUploadResponse(Long mediaId, String fileName, String mediaType, long sizeBytes) {
    public static MediaUploadResponse of(RecordMedia media) {
        return new MediaUploadResponse(media.getId(), media.getFileName(), media.getMediaType(), media.getSizeBytes());
    }
}
