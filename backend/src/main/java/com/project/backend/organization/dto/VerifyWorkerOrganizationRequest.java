package com.project.backend.organization.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyWorkerOrganizationRequest(@NotBlank String organizationCode) {}
