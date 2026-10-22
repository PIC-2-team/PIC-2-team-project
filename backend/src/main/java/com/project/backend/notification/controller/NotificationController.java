package com.project.backend.notification.controller;

import com.project.backend.common.response.ApiResponse;
import com.project.backend.common.response.PaginatedData;
import com.project.backend.notification.dto.MarkNotificationReadRequest;
import com.project.backend.notification.dto.NotificationResponse;
import com.project.backend.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Notifications")
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {
    private final NotificationService service;

    @Operation(summary = "내 알림 목록")
    @GetMapping
    public ApiResponse<PaginatedData<NotificationResponse>> list(@AuthenticationPrincipal Long userId,
            @RequestParam(required = false) Boolean read,
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.ok(service.list(userId, read, page, pageSize));
    }

    @Operation(summary = "안 읽은 알림 개수 조회")
    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> countUnread(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(Map.of("unreadCount", service.countUnread(userId)));
    }

    @Operation(summary = "내 알림 전체 읽음 처리")
    @PatchMapping("/read-all")
    public ApiResponse<Map<String, Object>> markAllRead(@AuthenticationPrincipal Long userId) {
        int count = service.markAllRead(userId);
        return ApiResponse.ok(Map.of("updatedCount", count));
    }

    @Operation(summary = "내 알림 읽음 상태 변경")
    @PatchMapping("/{notificationId}")
    public ApiResponse<NotificationResponse> markRead(@AuthenticationPrincipal Long userId,
            @PathVariable Long notificationId, @Valid @RequestBody MarkNotificationReadRequest request) {
        return ApiResponse.ok(service.markRead(userId, notificationId, request.read()));
    }
}
