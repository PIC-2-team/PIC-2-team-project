package com.project.backend.record.service;

import com.project.backend.care.entity.AccessLogAction;
import com.project.backend.care.entity.AccessLogResourceType;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.care.service.AccessLogService;
import com.project.backend.common.exception.ApiException;
import com.project.backend.record.dto.*;
import com.project.backend.record.entity.*;
import com.project.backend.record.repository.CareInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class CareInfoService {
    private final CareInfoRepository infos;
    private final CareRecipientRepository recipients;
    private final RecordAccessService access;
    private final DailyRecordService records;
    private final Clock clock;
    private final AccessLogService accessLogService;

    @Transactional(readOnly = true)
    public CareInfoOverviewResponse list(Long userId, Long recipientId) {
        access.verifyRead(userId, recipientId);
        Map<CareInfoCategory, CareInfoResponse> saved = new EnumMap<>(CareInfoCategory.class);
        infos.findByCareRecipientId(recipientId).forEach(info -> saved.put(info.getCategory(), CareInfoResponse.of(info)));
        List<CareInfoResponse> categories = Arrays.stream(CareInfoCategory.values())
                .map(category -> saved.getOrDefault(category, CareInfoResponse.empty(category))).toList();
        CareInfoOverviewResponse result = new CareInfoOverviewResponse(categories, records.pinned(userId, recipientId));
        accessLogService.log(userId, recipientId, AccessLogAction.VIEW, AccessLogResourceType.CARE_INFO, null);
        return result;
    }

    @Transactional(readOnly = true)
    public CareInfoResponse get(Long userId, Long recipientId, CareInfoCategory category) {
        access.verifyRead(userId, recipientId);
        CareInfoResponse result = infos.findByCareRecipientIdAndCategory(recipientId, category)
                .map(CareInfoResponse::of).orElseGet(() -> CareInfoResponse.empty(category));
        accessLogService.log(userId, recipientId, AccessLogAction.VIEW, AccessLogResourceType.CARE_INFO, null);
        return result;
    }

    public CareInfoResponse put(Long userId, Long recipientId, CareInfoCategory category, PutCareInfoRequest request) {
        access.verifyGuardian(userId, recipientId);
        // 최초 저장도 당사자 행으로 직렬화해 같은 분류의 중복 생성을 막는다.
        recipients.findForUpdate(recipientId).orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND, "CARE_RECIPIENT_NOT_FOUND", "당사자를 찾을 수 없습니다."));
        CareInfo info = infos.findByCareRecipientIdAndCategory(recipientId, category)
                .orElseGet(() -> new CareInfo(recipientId, category));
        info.update(request.content(), clock.instant());
        CareInfoResponse result = CareInfoResponse.of(infos.save(info));
        accessLogService.log(userId, recipientId, AccessLogAction.UPDATE, AccessLogResourceType.CARE_INFO, null);
        return result;
    }
}
