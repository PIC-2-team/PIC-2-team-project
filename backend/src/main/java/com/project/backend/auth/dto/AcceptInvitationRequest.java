package com.project.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record AcceptInvitationRequest(@NotBlank String invitationToken) {}
