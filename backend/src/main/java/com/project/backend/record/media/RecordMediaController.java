package com.project.backend.record.media;

import com.project.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "RecordMedia")
@RestController
@RequestMapping("/api/care-recipients/{careRecipientId}/media")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class RecordMediaController {
    private final RecordMediaService service;

    @Operation(summary = "미디어 업로드")
    @PostMapping(consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MediaUploadResponse> upload(@AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId, @RequestPart("file") MultipartFile file) {
        return ApiResponse.ok(service.upload(userId, careRecipientId, file));
    }

    @Operation(summary = "미디어 다운로드 URL 발급")
    @GetMapping("/{mediaId}/download-url")
    public ApiResponse<MediaDownloadUrlResponse> downloadUrl(@AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId, @PathVariable Long mediaId) {
        return ApiResponse.ok(service.downloadUrl(userId, careRecipientId, mediaId));
    }

    @Operation(summary = "미디어 삭제")
    @DeleteMapping("/{mediaId}")
    public ApiResponse<MediaDeleteResponse> delete(@AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId, @PathVariable Long mediaId) {
        return ApiResponse.ok(service.delete(userId, careRecipientId, mediaId));
    }
}
