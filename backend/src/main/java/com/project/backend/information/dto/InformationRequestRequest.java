package com.project.backend.information.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InformationRequestRequest(@NotBlank @Size(max = 1000) String message) {}
