package com.project.backend.memo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record CreateMemoRequest(
        @NotNull LocalDate date,
        @NotBlank @Size(max = 500) String content
) {}
