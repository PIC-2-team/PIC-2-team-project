package com.project.backend.user.controller;

import com.project.backend.auth.dto.UserInfo;
import com.project.backend.common.response.ApiResponse;
import com.project.backend.user.dto.ChangePasswordRequest;
import com.project.backend.user.dto.UpdateProfileRequest;
import com.project.backend.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Users")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    @Operation(summary = "내 정보 조회")
    @GetMapping("/me")
    public ApiResponse<UserInfo> getMe(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(userService.getMe(userId));
    }

    @Operation(summary = "프로필 수정")
    @PatchMapping("/me")
    public ApiResponse<UserInfo> updateProfile(@AuthenticationPrincipal Long userId,
                                                @Valid @RequestBody UpdateProfileRequest request) {
        return ApiResponse.ok(userService.updateProfile(userId, request));
    }

    @Operation(summary = "비밀번호 변경")
    @PatchMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal Long userId,
                                @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(userId, request);
    }
}
