package com.project.backend.organization.controller;

import com.project.backend.common.response.ApiResponse;
import com.project.backend.organization.service.CareAssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@Tag(name = "CareAssignments")
@RestController
@RequestMapping("/api/care-assignments")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class CareAssignmentController {

    private final CareAssignmentService careAssignmentService;

    @Operation(summary = "배정 종료")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void endAssignment(@PathVariable Long id) {
        careAssignmentService.endAssignment(id);
    }
}
