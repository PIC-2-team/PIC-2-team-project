package com.project.backend.memo.service;

import com.project.backend.common.exception.ApiException;
import com.project.backend.memo.dto.*;
import com.project.backend.memo.entity.CareMemo;
import com.project.backend.memo.repository.CareMemoRepository;
import com.project.backend.record.service.RecordAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CareMemoService {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final CareMemoRepository memos;
    private final RecordAccessService access;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<MemoResponse> listByDate(Long userId, Long recipientId, LocalDate date) {
        access.verifyRead(userId, recipientId);
        return memos.findByCareRecipientIdAndDateOrderByCreatedAtAsc(recipientId, date)
                .stream().map(MemoResponse::of).toList();
    }

    @Transactional(readOnly = true)
    public List<MemoResponse> listToday(Long userId, Long recipientId) {
        access.verifyRead(userId, recipientId);
        LocalDate today = clock.instant().atZone(SEOUL).toLocalDate();
        return memos.findByCareRecipientIdAndDateOrderByCreatedAtAsc(recipientId, today)
                .stream().map(MemoResponse::of).toList();
    }

    public MemoResponse create(Long userId, Long recipientId, CreateMemoRequest req) {
        access.verifyCreate(userId, recipientId);
        CareMemo memo = memos.save(CareMemo.builder()
                .careRecipientId(recipientId)
                .createdById(userId)
                .date(req.date())
                .content(req.content())
                .now(clock.instant())
                .build());
        return MemoResponse.of(memo);
    }

    public MemoResponse update(Long userId, Long recipientId, Long memoId, UpdateMemoRequest req) {
        access.verifyRead(userId, recipientId);
        CareMemo memo = find(memoId, recipientId);
        access.verifyEdit(userId, recipientId, memo.getCreatedById());
        memo.update(req.content(), clock.instant());
        return MemoResponse.of(memo);
    }

    public void delete(Long userId, Long recipientId, Long memoId) {
        access.verifyRead(userId, recipientId);
        CareMemo memo = find(memoId, recipientId);
        access.verifyEdit(userId, recipientId, memo.getCreatedById());
        memos.delete(memo);
    }

    private CareMemo find(Long memoId, Long recipientId) {
        return memos.findByIdAndCareRecipientId(memoId, recipientId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MEMO_NOT_FOUND", "메모를 찾을 수 없습니다."));
    }
}
