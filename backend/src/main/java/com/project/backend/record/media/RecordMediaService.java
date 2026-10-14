package com.project.backend.record.media;

import com.project.backend.common.exception.ApiException;
import com.project.backend.record.entity.DailyRecord;
import com.project.backend.record.repository.DailyRecordRepository;
import com.project.backend.record.service.RecordAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.core.ResponseBytes;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class RecordMediaService {
    private static final Duration DOWNLOAD_URL_TTL = Duration.ofMinutes(5);
    private static final long MAX_TRANSCRIPTION_SIZE = 25_000_000L;
    private static final Set<String> AUDIO_TYPES = Set.of("audio/mpeg", "audio/mp4", "audio/wav", "audio/webm");
    private final RecordMediaRepository mediaRepository;
    private final RecordMediaLinkRepository linkRepository;
    private final DailyRecordRepository recordRepository;
    private final RecordAccessService access;
    private final MediaFileValidator validator = new MediaFileValidator();
    private final S3Client s3;
    private final S3Presigner presigner;
    private final Clock clock;

    @Value("${cloud.aws.s3.bucket:}")
    private String bucket;

    public MediaUploadResponse upload(Long userId, Long recipientId, MultipartFile file) {
        access.verifyCreate(userId, recipientId);
        MediaFileValidator.ValidatedMedia validated;
        try {
            validated = validator.validate(file);
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_MEDIA_FILE", e.getMessage());
        }
        String key = "media/" + recipientId + "/" + UUID.randomUUID() + "." + validated.extension();
        try (var input = file.getInputStream()) {
            s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(validated.mediaType()).build(),
                    RequestBody.fromInputStream(input, validated.sizeBytes()));
        } catch (IOException | RuntimeException e) {
            throw storageFailure(e);
        }
        RecordMedia media = new RecordMedia(recipientId, userId, validated.fileName(), validated.mediaType(),
                validated.sizeBytes(), key, clock.instant());
        try {
            return MediaUploadResponse.of(mediaRepository.save(media));
        } catch (RuntimeException e) {
            try { s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build()); }
            catch (RuntimeException cleanupFailure) { e.addSuppressed(cleanupFailure); }
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public MediaDownloadUrlResponse downloadUrl(Long userId, Long recipientId, Long mediaId) {
        access.verifyRead(userId, recipientId);
        RecordMedia media = find(recipientId, mediaId);
        var request = GetObjectRequest.builder().bucket(bucket).key(media.getS3Key())
                .responseContentDisposition("attachment").build();
        var presigned = presigner.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(DOWNLOAD_URL_TTL).getObjectRequest(request).build());
        return new MediaDownloadUrlResponse(presigned.url().toString(), clock.instant().plus(DOWNLOAD_URL_TTL));
    }

    public MediaDeleteResponse delete(Long userId, Long recipientId, Long mediaId) {
        access.verifyRead(userId, recipientId);
        RecordMedia media = find(recipientId, mediaId);
        List<RecordMediaLink> links = linkRepository.findAllByMediaId(mediaId);
        if (links.isEmpty()) {
            if (!media.getUploaderId().equals(userId)) forbidden();
        } else {
            for (RecordMediaLink link : links) {
                DailyRecord record = recordRepository.findByIdAndCareRecipientId(link.getRecordId(), recipientId)
                        .orElseThrow(this::notFound);
                access.verifyEdit(userId, recipientId, record.getAuthorId());
            }
        }
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(media.getS3Key()).build());
        } catch (RuntimeException e) {
            throw storageFailure(e);
        }
        linkRepository.deleteAllByMediaId(mediaId);
        mediaRepository.delete(media);
        return new MediaDeleteResponse(true);
    }

    @Transactional(readOnly = true)
    public AudioAsset getForTranscription(Long userId, Long mediaId) {
        RecordMedia media = mediaRepository.findById(mediaId).orElseThrow(this::notFound);
        access.verifyRead(userId, media.getCareRecipientId());
        if (!AUDIO_TYPES.contains(media.getMediaType()) || media.getSizeBytes() > MAX_TRANSCRIPTION_SIZE) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_AUDIO_MEDIA", "전사할 수 없는 오디오 파일입니다.");
        }
        try {
            ResponseBytes<GetObjectResponse> bytes = s3.getObjectAsBytes(GetObjectRequest.builder()
                    .bucket(bucket).key(media.getS3Key()).build());
            return new AudioAsset(media.getFileName(), media.getMediaType(), bytes.asByteArray());
        } catch (RuntimeException e) {
            throw storageFailure(e);
        }
    }

    public List<RecordMedia> validateIds(Long recipientId, List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        if (ids.size() > 5 || new HashSet<>(ids).size() != ids.size()) invalidIds();
        List<RecordMedia> found = mediaRepository.findAllByIdInAndCareRecipientId(ids, recipientId);
        if (found.size() != ids.size()) invalidIds();
        Map<Long, RecordMedia> byId = new HashMap<>();
        found.forEach(media -> byId.put(media.getId(), media));
        return ids.stream().map(byId::get).toList();
    }

    public void replaceLinks(Long recordId, List<RecordMedia> media) {
        linkRepository.deleteAllByRecordId(recordId);
        media.forEach(item -> linkRepository.save(new RecordMediaLink(recordId, item.getId())));
    }

    public List<RecordMedia> forRecord(Long recordId) {
        return forRecords(List.of(recordId)).getOrDefault(recordId, List.of());
    }

    public Map<Long, List<RecordMedia>> forRecords(List<Long> recordIds) {
        if (recordIds.isEmpty()) return Map.of();
        List<RecordMediaLink> links = linkRepository.findAllByRecordIdInOrderById(recordIds);
        Map<Long, RecordMedia> byId = new HashMap<>();
        mediaRepository.findAllById(links.stream().map(RecordMediaLink::getMediaId).distinct().toList())
                .forEach(item -> byId.put(item.getId(), item));
        Map<Long, List<RecordMedia>> result = new HashMap<>();
        for (RecordMediaLink link : links) {
            RecordMedia item = byId.get(link.getMediaId());
            if (item != null) result.computeIfAbsent(link.getRecordId(), ignored -> new ArrayList<>()).add(item);
        }
        return result;
    }

    private RecordMedia find(Long recipientId, Long mediaId) {
        return mediaRepository.findById(mediaId).filter(m -> m.getCareRecipientId().equals(recipientId))
                .orElseThrow(this::notFound);
    }

    private void invalidIds() {
        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_MEDIA_IDS", "첨부 미디어가 올바르지 않습니다.");
    }

    private void forbidden() {
        throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다.");
    }

    private ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "MEDIA_NOT_FOUND", "미디어를 찾을 수 없습니다.");
    }

    private ApiException storageFailure(Exception cause) {
        return new ApiException(HttpStatus.BAD_GATEWAY, "MEDIA_STORAGE_FAILED", "미디어 저장소 요청을 처리하지 못했습니다.");
    }

    public record AudioAsset(String fileName, String mediaType, byte[] bytes) { }
}
