package com.project.backend.care.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public record RoutineRequest(
        @NotNull @JsonFormat(pattern = "HH:mm") LocalTime time,
        @NotBlank @Size(max = 100) String title,
        @Size(max = 500) String memo
) {}
