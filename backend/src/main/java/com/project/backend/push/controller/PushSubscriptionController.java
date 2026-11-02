package com.project.backend.push.controller;

import com.project.backend.common.response.ApiResponse;
import com.project.backend.push.config.VapidProperties;
import com.project.backend.push.dto.PushSubscribeRequest;
import com.project.backend.push.service.PushSubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
public class PushSubscriptionController {

    private final PushSubscriptionService pushSubscriptionService;
    private final VapidProperties vapidProperties;

    @GetMapping("/vapid-public-key")
    public ApiResponse<Map<String, String>> getVapidPublicKey() {
        return ApiResponse.ok(Map.of("publicKey", vapidProperties.getPublicKey()));
    }

    @PostMapping("/subscribe")
    public ApiResponse<Void> subscribe(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody PushSubscribeRequest request) {
        pushSubscriptionService.subscribe(userId, request.endpoint(), request.p256dh(), request.auth());
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/subscribe")
    public ApiResponse<Void> unsubscribe(
            @AuthenticationPrincipal Long userId,
            @RequestParam String endpoint) {
        pushSubscriptionService.unsubscribe(userId, endpoint);
        return ApiResponse.ok(null);
    }
}
