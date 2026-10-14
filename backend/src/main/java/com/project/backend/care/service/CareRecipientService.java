package com.project.backend.care.service;

import com.project.backend.care.dto.CareRecipientResponse;
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
        } else {
            return List.of();
        }

        return careRecipientRepository.findAllById(recipientIds).stream()
                .map(r -> {
                    List<DisabilityType> disabilities = disabilityRepository
                            .findByCareRecipientId(r.getId()).stream()
                            .map(CareRecipientDisability::getDisabilityType).toList();
                    return CareRecipientResponse.of(r, disabilities);
                }).toList();
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

        List<DisabilityType> disabilities = disabilityRepository
                .findByCareRecipientId(recipientId).stream()
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

    private CareRecipient findRecipient(Long id) {
        return careRecipientRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CARE_RECIPIENT_NOT_FOUND", "당사자를 찾을 수 없습니다."));
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));
    }
}
