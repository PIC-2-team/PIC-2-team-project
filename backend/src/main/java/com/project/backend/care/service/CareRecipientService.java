package com.project.backend.care.service;

import com.project.backend.care.dto.CareRecipientResponse;
import com.project.backend.care.dto.ClaimCareRecipientRequest;
import com.project.backend.care.dto.CreateCareRecipientRequest;
import com.project.backend.care.dto.UpdateCareRecipientRequest;
import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientDisabilityRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.project.backend.care.dto.CareRelationsResponse;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationGuardianLink;
import com.project.backend.organization.entity.OrganizationRecipientLink;
import com.project.backend.organization.repository.OrganizationGuardianLinkRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class CareRecipientService {

    private final CareRecipientRepository careRecipientRepository;
    private final CareRecipientDisabilityRepository disabilityRepository;
    private final CareGuardianRepository careGuardianRepository;
    private final CareAssignmentRepository careAssignmentRepository;
    private final CareRecipientNumberGenerator numberGenerator;
    private final CareAccessService careAccessService;
    private final UserRepository userRepository;
    private final OrganizationRecipientLinkRepository organizationRecipientLinkRepository;
    private final OrganizationGuardianLinkRepository organizationGuardianLinkRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional(readOnly = true)
    public List<CareRecipientResponse> getAll(Long userId) {
        User user = findUser(userId);
        List<Long> recipientIds;

        if (user.getRole() == UserRole.GUARDIAN) {
            recipientIds = careGuardianRepository.findByGuardianIdAndStatus(userId, GuardianStatus.ACTIVE)
                    .stream().map(CareGuardian::getCareRecipientId).toList();
        } else if (user.getRole() == UserRole.SUPPORT_WORKER) {
            recipientIds = careAssignmentRepository.findBySupportWorkerIdAndEndedAtIsNull(userId)
                    .stream().map(CareAssignment::getCareRecipientId).toList();
        } else if (user.getRole() == UserRole.INSTITUTION) {
            Organization org = organizationRepository.findByOwnerId(userId).orElse(null);
            if (org == null) return List.of();
            recipientIds = organizationRecipientLinkRepository.findByOrganizationId(org.getId()).stream()
                    .filter(l -> l.getStatus() == com.project.backend.organization.entity.LinkStatus.ACCEPTED)
                    .map(OrganizationRecipientLink::getCareRecipientId).toList();
        } else {
            return List.of();
        }

        List<CareRecipient> recipients = careRecipientRepository.findAllById(recipientIds);
        Map<Long, List<DisabilityType>> disabilityMap = disabilityRepository
                .findByCareRecipientIdIn(recipientIds).stream()
                .collect(Collectors.groupingBy(
                        CareRecipientDisability::getCareRecipientId,
                        Collectors.mapping(CareRecipientDisability::getDisabilityType, Collectors.toList())));

        return recipients.stream()
                .map(r -> CareRecipientResponse.of(r, disabilityMap.getOrDefault(r.getId(), List.of())))
                .toList();
    }

    public CareRecipientResponse register(Long guardianUserId, CreateCareRecipientRequest request) {
        User user = findUser(guardianUserId);
        if (user.getRole() != UserRole.GUARDIAN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "보호자만 당사자를 등록할 수 있습니다.");
        }

        CareRecipient recipient = CareRecipient.builder()
                .careRecipientNumber(numberGenerator.generate())
                .name(request.name())
                .birthDate(request.birthDate())
                .gender(request.gender())
                .disabilityGrade(request.disabilityGrade())
                .otherDisabilityType(request.otherDisabilityType())
                .build();
        recipient = careRecipientRepository.save(recipient);

        Long recipientId = recipient.getId();
        if (request.disabilityTypes() != null) {
            disabilityRepository.saveAll(request.disabilityTypes().stream()
                    .map(dt -> CareRecipientDisability.builder()
                            .careRecipientId(recipientId).disabilityType(dt).build())
                    .toList());
        }

        careGuardianRepository.save(CareGuardian.builder()
                .careRecipientId(recipientId)
                .guardianId(guardianUserId)
                .type(GuardianType.PRIMARY)
                .status(GuardianStatus.ACTIVE)
                .build());

        // 보호자가 속한 기관들에 대해 당사자 링크 자동 연결
        List<OrganizationGuardianLink> orgLinks = organizationGuardianLinkRepository.findByGuardianId(guardianUserId);
        for (OrganizationGuardianLink orgLink : orgLinks) {
            OrganizationRecipientLink link = OrganizationRecipientLink.builder()
                    .organizationId(orgLink.getOrganizationId())
                    .careRecipientId(recipientId)
                    .requestedById(guardianUserId)
                    .build();
            link.accept();
            organizationRecipientLinkRepository.save(link);
        }

        List<DisabilityType> disabilities = disabilityRepository
                .findByCareRecipientId(recipientId).stream()
                .map(CareRecipientDisability::getDisabilityType).toList();

        return CareRecipientResponse.of(recipient, disabilities);
    }

    public CareRecipientResponse claim(Long guardianUserId, ClaimCareRecipientRequest request) {
        User user = findUser(guardianUserId);
        if (user.getRole() != UserRole.GUARDIAN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "보호자만 당사자를 등록할 수 있습니다.");
        }

        CareRecipient recipient = careRecipientRepository.findByCareRecipientNumber(request.careRecipientNumber().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CARE_RECIPIENT_NOT_FOUND", "해당 고유 코드의 당사자를 찾을 수 없습니다."));

        boolean alreadyClaimed = careGuardianRepository.findByCareRecipientIdAndTypeAndStatus(
                recipient.getId(), GuardianType.PRIMARY, GuardianStatus.ACTIVE
        ).isPresent();

        if (alreadyClaimed) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_CLAIMED", "이미 보호자가 등록된 당사자입니다.");
        }

        careGuardianRepository.save(CareGuardian.builder()
                .careRecipientId(recipient.getId())
                .guardianId(guardianUserId)
                .type(GuardianType.PRIMARY)
                .status(GuardianStatus.ACTIVE)
                .build());

        List<DisabilityType> disabilities = disabilityRepository
                .findByCareRecipientId(recipient.getId()).stream()
                .map(CareRecipientDisability::getDisabilityType).toList();

        return CareRecipientResponse.of(recipient, disabilities);
    }

    @Transactional(readOnly = true)
    public CareRecipientResponse getById(Long userId, Long careRecipientId) {
        careAccessService.verifyAccess(userId, careRecipientId);
        CareRecipient recipient = findRecipient(careRecipientId);
        List<DisabilityType> disabilities = disabilityRepository
                .findByCareRecipientId(careRecipientId).stream()
                .map(CareRecipientDisability::getDisabilityType).toList();
        return CareRecipientResponse.of(recipient, disabilities);
    }

    public CareRecipientResponse update(Long userId, Long careRecipientId, UpdateCareRecipientRequest request) {
        User user = findUser(userId);
        if (user.getRole() != UserRole.GUARDIAN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "보호자만 당사자 정보를 수정할 수 있습니다.");
        }
        careAccessService.verifyAccess(userId, careRecipientId);
        CareRecipient recipient = findRecipient(careRecipientId);

        recipient.update(request.name(), request.birthDate(), request.gender(),
                request.disabilityGrade(), request.otherDisabilityType());

        if (request.disabilityTypes() != null) {
            disabilityRepository.deleteByCareRecipientId(careRecipientId);
            disabilityRepository.saveAll(request.disabilityTypes().stream()
                    .map(dt -> CareRecipientDisability.builder()
                            .careRecipientId(careRecipientId).disabilityType(dt).build())
                    .toList());
        }

        List<DisabilityType> disabilities = disabilityRepository
                .findByCareRecipientId(careRecipientId).stream()
                .map(CareRecipientDisability::getDisabilityType).toList();
        return CareRecipientResponse.of(recipient, disabilities);
    }

    @Transactional(readOnly = true)
    public CareRelationsResponse getRelations(Long userId, Long careRecipientId) {
        careAccessService.verifyAccess(userId, careRecipientId);

        List<OrganizationRecipientLink> links = organizationRecipientLinkRepository.findByCareRecipientId(careRecipientId);
        List<Long> orgIds = links.stream().map(OrganizationRecipientLink::getOrganizationId).distinct().toList();
        Map<Long, Organization> orgMap = organizationRepository.findAllById(orgIds).stream()
                .collect(Collectors.toMap(Organization::getId, Function.identity()));

        List<CareRelationsResponse.OrganizationLinkInfo> orgInfos = links.stream().map(link -> {
            Organization org = orgMap.get(link.getOrganizationId());
            String orgName = org != null ? org.getName() : "기관 #" + link.getOrganizationId();
            String orgCode = org != null ? org.getOrganizationCode() : "";
            return new CareRelationsResponse.OrganizationLinkInfo(
                    link.getId(), link.getOrganizationId(), orgName, orgCode, link.getStatus(), link.getRequestedAt());
        }).toList();

        List<CareAssignment> assignments = careAssignmentRepository.findByCareRecipientIdAndEndedAtIsNull(careRecipientId);
        List<Long> workerIds = assignments.stream().map(CareAssignment::getSupportWorkerId).distinct().toList();
        Map<Long, User> userMap = userRepository.findAllById(workerIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        List<CareRelationsResponse.AssignedWorkerInfo> workerInfos = assignments.stream().map(a -> {
            User worker = userMap.get(a.getSupportWorkerId());
            String workerName = worker != null ? worker.getName() : "지원사 #" + a.getSupportWorkerId();
            Organization org = orgMap.get(a.getOrganizationId());
            if (org == null) {
                org = organizationRepository.findById(a.getOrganizationId()).orElse(null);
            }
            String orgName = org != null ? org.getName() : "기관 #" + a.getOrganizationId();
            return new CareRelationsResponse.AssignedWorkerInfo(
                    a.getId(), a.getSupportWorkerId(), workerName,
                    a.getOrganizationId(), orgName,
                    a.getStartDate(), a.getEndDate(), a.getEndedAt());
        }).toList();

        return new CareRelationsResponse(careRecipientId, orgInfos, workerInfos);
    }

    @Transactional(readOnly = true)
    public List<CareRecipientResponse> getOrganizationRecipients(Long ownerId) {
        Organization org = findOrgByOwner(ownerId);
        List<Long> recipientIds = organizationRecipientLinkRepository.findByOrganizationId(org.getId()).stream()
                .filter(l -> l.getStatus() == com.project.backend.organization.entity.LinkStatus.ACCEPTED)
                .map(OrganizationRecipientLink::getCareRecipientId)
                .toList();

        List<CareRecipient> recipients = careRecipientRepository.findAllById(recipientIds);
        Map<Long, List<DisabilityType>> disabilityMap = disabilityRepository
                .findByCareRecipientIdIn(recipientIds).stream()
                .collect(Collectors.groupingBy(
                        CareRecipientDisability::getCareRecipientId,
                        Collectors.mapping(CareRecipientDisability::getDisabilityType, Collectors.toList())));

        // 당사자를 등록한 주 보호자 조회 (Primary Guardian)
        List<CareGuardian> primaryGuardians = careGuardianRepository.findByCareRecipientIdInAndTypeAndStatus(
                recipientIds, GuardianType.PRIMARY, GuardianStatus.ACTIVE);
        Map<Long, Long> recipientToGuardianId = primaryGuardians.stream()
                .collect(Collectors.toMap(CareGuardian::getCareRecipientId, CareGuardian::getGuardianId, (a, b) -> a));

        List<Long> guardianUserIds = recipientToGuardianId.values().stream().distinct().toList();
        Map<Long, User> guardianUserMap = userRepository.findAllById(guardianUserIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return recipients.stream()
                .map(r -> {
                    Long gId = recipientToGuardianId.get(r.getId());
                    User gUser = gId != null ? guardianUserMap.get(gId) : null;
                    String gName = gUser != null ? gUser.getName() : null;
                    String gPhone = gUser != null ? gUser.getPhone() : null;
                    return CareRecipientResponse.of(
                            r,
                            disabilityMap.getOrDefault(r.getId(), List.of()),
                            gName,
                            gPhone
                    );
                })
                .toList();
    }

    public CareRecipientResponse registerByOrganization(Long ownerId, CreateCareRecipientRequest request) {
        Organization org = findOrgByOwner(ownerId);

        CareRecipient recipient = CareRecipient.builder()
                .careRecipientNumber(numberGenerator.generate())
                .name(request.name())
                .birthDate(request.birthDate())
                .gender(request.gender())
                .disabilityGrade(request.disabilityGrade())
                .otherDisabilityType(request.otherDisabilityType())
                .build();
        recipient = careRecipientRepository.save(recipient);

        Long recipientId = recipient.getId();
        if (request.disabilityTypes() != null) {
            disabilityRepository.saveAll(request.disabilityTypes().stream()
                    .map(dt -> CareRecipientDisability.builder()
                            .careRecipientId(recipientId).disabilityType(dt).build())
                    .toList());
        }

        OrganizationRecipientLink link = OrganizationRecipientLink.builder()
                .organizationId(org.getId())
                .careRecipientId(recipientId)
                .requestedById(ownerId)
                .build();
        link.accept();
        organizationRecipientLinkRepository.save(link);

        return CareRecipientResponse.of(recipient, request.disabilityTypes());
    }

    public CareRecipientResponse updateByOrganization(Long ownerId, Long recipientId, UpdateCareRecipientRequest request) {
        Organization org = findOrgByOwner(ownerId);
        if (!organizationRecipientLinkRepository.existsByOrganizationIdAndCareRecipientIdAndStatus(
                org.getId(), recipientId, com.project.backend.organization.entity.LinkStatus.ACCEPTED)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "기관에 등록된 당사자가 아닙니다.");
        }

        CareRecipient recipient = findRecipient(recipientId);
        recipient.update(request.name(), request.birthDate(), request.gender(),
                request.disabilityGrade(), request.otherDisabilityType());

        if (request.disabilityTypes() != null) {
            disabilityRepository.deleteByCareRecipientId(recipientId);
            disabilityRepository.saveAll(request.disabilityTypes().stream()
                    .map(dt -> CareRecipientDisability.builder()
                            .careRecipientId(recipientId).disabilityType(dt).build())
                    .toList());
        }

        List<DisabilityType> disabilities = disabilityRepository
                .findByCareRecipientId(recipientId).stream()
                .map(CareRecipientDisability::getDisabilityType).toList();
        return CareRecipientResponse.of(recipient, disabilities);
    }

    public void deleteByOrganization(Long ownerId, Long recipientId) {
        Organization org = findOrgByOwner(ownerId);
        OrganizationRecipientLink link = organizationRecipientLinkRepository
                .findByOrganizationIdAndCareRecipientId(org.getId(), recipientId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "LINK_NOT_FOUND", "기관 연결을 찾을 수 없습니다."));

        organizationRecipientLinkRepository.delete(link);

        // 진행 중인 배정도 종료 처리
        List<CareAssignment> activeAssignments = careAssignmentRepository
                .findByOrganizationIdAndCareRecipientId(org.getId(), recipientId).stream()
                .filter(a -> a.getEndedAt() == null).toList();
        for (CareAssignment assignment : activeAssignments) {
            assignment.end();
            careAssignmentRepository.save(assignment);
        }
    }

    private Organization findOrgByOwner(Long ownerId) {
        return organizationRepository.findByOwnerId(ownerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND", "기관을 찾을 수 없습니다."));
    }

    private CareRecipient findRecipient(Long id) {
        return careRecipientRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CARE_RECIPIENT_NOT_FOUND", "당사자를 찾을 수 없습니다."));
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));
    }
}
