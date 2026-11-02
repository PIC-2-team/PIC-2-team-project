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
    public List<MemoResponse> listByMonth(Long userId, Long recipientId, int year, int month) {
        access.verifyRead(userId, recipientId);
        if (month < 1 || month > 12 || year < 1900 || year > 9999) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "조회할 연월이 올바르지 않습니다.");
        }
        LocalDate start = YearMonth.of(year, month).atDay(1);
        LocalDate end = start.plusMonths(1);
        return memos.findByCareRecipientIdAndDateGreaterThanEqualAndDateLessThanOrderByDateAscCreatedAtAsc(
                recipientId, start, end).stream().map(MemoResponse::of).toList();
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
        Instant now = clock.instant();
        CareMemo memo = memos.save(CareMemo.builder()
                .careRecipientId(recipientId)
                .createdById(userId)
                .date(now.atZone(SEOUL).toLocalDate())
                .content(req.content())
                .now(now)
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
