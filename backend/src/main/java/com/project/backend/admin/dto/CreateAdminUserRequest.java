package com.project.backend.admin.dto;

import com.project.backend.user.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateAdminUserRequest(
        @NotBlank(message = "이름을 입력해 주세요.")
        String name,

        @NotBlank(message = "이메일을 입력해 주세요.")
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        String email,

        @NotBlank(message = "비밀번호를 입력해 주세요.")
        @Size(min = 6, message = "비밀번호는 6자 이상이어야 합니다.")
        String password,

        @NotNull(message = "역할을 선택해 주세요.")
        UserRole role,

        String phone,

        Long organizationId
) {}
