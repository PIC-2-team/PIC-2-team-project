package com.project.backend.record.dto;
import java.util.List;
public record CareInfoOverviewResponse(List<CareInfoResponse> categories, List<RecordResponse> pinnedRecords) { }
