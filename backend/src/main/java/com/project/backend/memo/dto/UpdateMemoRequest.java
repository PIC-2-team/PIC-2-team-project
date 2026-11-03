package com.project.backend.memo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateMemoRequest(
        @NotBlank @Size(max = 500) String content
) {}
