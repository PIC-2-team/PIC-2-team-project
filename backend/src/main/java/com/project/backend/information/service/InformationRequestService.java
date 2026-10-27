package com.project.backend.information.service;

import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.common.response.PaginatedData;
import com.project.backend.information.dto.InformationRequestRequest;
import com.project.backend.information.dto.InformationRequestResponse;
import com.project.backend.information.entity.InformationRequest;
import com.project.backend.information.entity.InformationRequestStatus;
import com.project.backend.information.repository.InformationRequestRepository;
import com.project.backend.notification.service.NotificationService;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class InformationRequestService {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final List<InformationRequestStatus> GUARDIAN_VISIBLE_STATUSES = List.of(
            InformationRequestStatus.FORWARDED, InformationRequestStatus.ANSWERED, InformationRequestStatus.CLOSED);
    private final InformationRequestRepository requests;
    private final CareAssignmentRepository assignments;
    private final CareGuardianRepository guardians;
    private final OrganizationRepository organizations;
    private final OrganizationRecipientLinkRepository links;
    private final UserRepository users;
    private final NotificationService notifications;
    private final Clock clock;

    public InformationRequestResponse create(Long userId, Long recipientId, InformationRequestRequest body) {
        User requester = requireRole(userId, UserRole.SUPPORT_WORKER);
        LocalDate today = LocalDate.ofInstant(clock.instant(), SEOUL);
        var assignment = assignments.findBySupportWorkerIdAndCareRecipientIdAndEndedAtIsNull(userId, recipientId)
                .filter(a -> !a.getStartDate().isAfter(today) && (a.getEndDate() == null || !a.getEndDate().isBefore(today)))
                .orElseThrow(this::forbidden);
        if (!links.existsByOrganizationIdAndCareRecipientIdAndStatus(assignment.getOrganizationId(), recipientId, LinkStatus.ACCEPTED)) {
            throw forbidden();
        }
        InformationRequest request = requests.save(new InformationRequest(recipientId, userId,
                assignment.getOrganizationId(), body.message().trim(), clock.instant()));
        Organization organization = organizations.findById(assignment.getOrganizationId()).orElseThrow(this::forbidden);
        notifications.notifyInformationRequest(organization.getOwnerId(), "새 정보 요청이 도착했습니다.");
        return response(request);
    }

    @Transactional(readOnly = true)
    public PaginatedData<InformationRequestResponse> listRequester(Long userId, InformationRequestStatus status, int page, int pageSize) {
        requireRole(userId, UserRole.SUPPORT_WORKER);
        Page<InformationRequest> result = status == null
                ? requests.findByRequestedById(userId, pageable(page, pageSize))
                : requests.findByRequestedByIdAndStatus(userId, status, pageable(page, pageSize));
        return page(result);
    }

    @Transactional(readOnly = true)
    public PaginatedData<InformationRequestResponse> listOrganization(Long userId, InformationRequestStatus status, int page, int pageSize) {
        Organization organization = organization(userId);
        Page<InformationRequest> result = status == null
                ? requests.findByOrganizationId(organization.getId(), pageable(page, pageSize))
                : requests.findByOrganizationIdAndStatus(organization.getId(), status, pageable(page, pageSize));
        return page(result);
    }

    @Transactional(readOnly = true)
    public PaginatedData<InformationRequestResponse> listGuardian(Long userId, Long recipientId, InformationRequestStatus status,
                                                                   int page, int pageSize) {
        requireGuardian(userId, recipientId);
        Page<InformationRequest> result = status == null
                ? requests.findByCareRecipientIdAndStatusIn(recipientId, GUARDIAN_VISIBLE_STATUSES, pageable(page, pageSize))
                : requests.findByCareRecipientIdAndStatusInAndStatus(recipientId, GUARDIAN_VISIBLE_STATUSES,
                        status, pageable(page, pageSize));
        return page(result);
    }

    public InformationRequestResponse forward(Long userId, Long requestId) {
        Organization organization = organization(userId);
        InformationRequest request = requestForUpdate(requestId);
        if (!request.getOrganizationId().equals(organization.getId())) throw requestNotFound();
        requireStatus(request, InformationRequestStatus.SUBMITTED);
        request.forward(clock.instant());
        notifications.notifyInformationRequestGuardians(request.getCareRecipientId());
        return response(request);
    }

    public InformationRequestResponse reply(Long userId, Long recipientId, Long requestId, InformationRequestRequest body) {
        requireGuardian(userId, recipientId);
        InformationRequest request = requestForUpdate(requestId);
        if (!request.getCareRecipientId().equals(recipientId)) throw requestNotFound();
        requireStatus(request, InformationRequestStatus.FORWARDED);
        request.reply(userId, body.message().trim(), clock.instant());
        notifications.notifyInformationRequest(request.getRequestedById(), "정보 요청에 답변이 도착했습니다.");
        return response(request);
    }

    public InformationRequestResponse close(Long userId, Long requestId) {
        Organization organization = organization(userId);
        InformationRequest request = requestForUpdate(requestId);
        if (!request.getOrganizationId().equals(organization.getId())) throw requestNotFound();
        requireStatus(request, InformationRequestStatus.ANSWERED);
        request.close(clock.instant());
        return response(request);
    }

    private void requireGuardian(Long userId, Long recipientId) {
        requireRole(userId, UserRole.GUARDIAN);
        if (!guardians.existsByCareRecipientIdAndGuardianIdAndStatus(recipientId, userId, GuardianStatus.ACTIVE)) throw forbidden();
    }

    private User requireRole(Long userId, UserRole role) {
        User user = users.findById(userId).orElseThrow(this::forbidden);
        if (user.getRole() != role) throw forbidden();
        return user;
    }

    private Organization organization(Long userId) {
        requireRole(userId, UserRole.INSTITUTION);
        return organizations.findFirstByOwnerIdOrderByIdAsc(userId).orElseThrow(this::forbidden);
    }

    private InformationRequest requestForUpdate(Long id) {
        return requests.findForUpdate(id).orElseThrow(this::requestNotFound);
    }

    private void requireStatus(InformationRequest request, InformationRequestStatus expected) {
        if (request.getStatus() != expected) throw new ApiException(HttpStatus.CONFLICT, "INFORMATION_REQUEST_CONFLICT", "현재 상태에서는 처리할 수 없습니다.");
    }

    private InformationRequestResponse response(InformationRequest request) {
        User requester = users.findById(request.getRequestedById()).orElseThrow(this::requestNotFound);
        User replier = request.getRepliedById() == null ? null : users.findById(request.getRepliedById()).orElseThrow(this::requestNotFound);
        return InformationRequestResponse.of(request, requester, replier);
    }

    private PaginatedData<InformationRequestResponse> page(Page<InformationRequest> page) {
        var items = page.getContent();
        var ids = items.stream().flatMap(r -> java.util.stream.Stream.of(r.getRequestedById(), r.getRepliedById()))
                .filter(id -> id != null).collect(Collectors.toSet());
        Map<Long, User> people = users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return new PaginatedData<>(items.stream().map(r -> InformationRequestResponse.of(r, people.get(r.getRequestedById()),
                r.getRepliedById() == null ? null : people.get(r.getRepliedById()))).toList(),
                new PaginatedData.Pagination(page.getNumber() + 1, page.getSize(), page.getTotalElements(), page.getTotalPages()));
    }

    private Pageable pageable(int page, int size) {
        if (page < 1 || size < 1 || size > 100) throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "페이지 조건이 올바르지 않습니다.");
        return PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
    }

    private ApiException forbidden() { return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다."); }
    private ApiException requestNotFound() { return new ApiException(HttpStatus.NOT_FOUND, "INFORMATION_REQUEST_NOT_FOUND", "정보 요청을 찾을 수 없습니다."); }
}
