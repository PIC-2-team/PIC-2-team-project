package com.project.backend.admin.dto;

public record AdminStatsResponse(
        long totalUsers,
        long guardians,
        long supportWorkers,
        long institutions,
        long totalOrganizations,
        long totalCareRecipients,
        long totalRecords
) {}
