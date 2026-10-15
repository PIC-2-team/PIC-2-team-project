package com.project.backend.care.dto;

import jakarta.validation.constraints.NotBlank;

public record LinkRecipientRequest(@NotBlank String organizationCode) {}
