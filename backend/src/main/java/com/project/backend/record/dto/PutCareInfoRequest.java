package com.project.backend.record.dto;
import jakarta.validation.constraints.*;
public record PutCareInfoRequest(@NotNull @Size(max = 3000) String content) { }
