package com.project.backend.user.service;

import com.project.backend.auth.dto.UserInfo;
import com.project.backend.common.exception.ApiException;
import com.project.backend.user.dto.ChangePasswordRequest;
import com.project.backend.user.dto.NotificationSettingsResponse;
import com.project.backend.user.dto.UpdateProfileRequest;
import com.project.backend.user.dto.UpdateNotificationSettingsRequest;
import com.project.backend.user.entity.User;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserInfo getMe(Long userId) {
        return UserInfo.from(findUser(userId));
    }

    public UserInfo updateProfile(Long userId, UpdateProfileRequest request) {
        User user = findUser(userId);
        user.updateProfile(request.name(), request.phone());
        return UserInfo.from(user);
    }

    @Transactional(readOnly = true)
    public NotificationSettingsResponse getNotificationSettings(Long userId) {
        return NotificationSettingsResponse.from(findUser(userId));
    }

    public NotificationSettingsResponse updateNotificationSettings(Long userId, UpdateNotificationSettingsRequest request) {
        User user = findUser(userId);
        user.updateNotificationSettings(request.recordCreated(), request.recordUpdated(), request.assignmentChanged(),
                request.informationRequestReceived());
        return NotificationSettingsResponse.from(user);
    }

    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = findUser(userId);

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "현재 비밀번호가 올바르지 않습니다.");
        }

        user.updatePassword(passwordEncoder.encode(request.newPassword()));
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));
    }
}
