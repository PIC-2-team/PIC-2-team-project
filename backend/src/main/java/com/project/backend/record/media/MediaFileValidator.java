package com.project.backend.record.media;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

public class MediaFileValidator {
    public static final long MAX_SIZE = 50L * 1024 * 1024;
    private static final Map<String, String> MIME_EXTENSIONS = Map.of(
            "image/jpeg", "jpg", "image/png", "png", "image/webp", "webp",
            "video/mp4", "mp4", "audio/mpeg", "mp3", "audio/mp4", "m4a",
            "audio/wav", "wav", "audio/webm", "webm");

    public ValidatedMedia validate(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_SIZE) throw new IllegalArgumentException("파일 크기가 올바르지 않습니다.");
        String mimeType = file.getContentType();
        String extension = MIME_EXTENSIONS.get(mimeType);
        if (extension == null) throw new IllegalArgumentException("지원하지 않는 파일 형식입니다.");
        try {
            byte[] header;
            try (var input = file.getInputStream()) {
                header = input.readNBytes(12);
            }
            if (!matches(mimeType, header)) throw new IllegalArgumentException("파일 내용과 형식이 일치하지 않습니다.");
        } catch (IOException e) {
            throw new IllegalArgumentException("파일을 읽을 수 없습니다.");
        }
        String originalName = file.getOriginalFilename();
        String fileName = originalName == null ? "file" : originalName.replaceAll("[\\\\/\\p{Cntrl}]", "_");
        if (fileName.isBlank()) fileName = "file";
        if (fileName.length() > 255) fileName = fileName.substring(fileName.length() - 255);
        return new ValidatedMedia(fileName, mimeType, file.getSize(), extension);
    }

    private boolean matches(String mime, byte[] bytes) {
        return switch (mime) {
            case "image/jpeg" -> starts(bytes, 0xff, 0xd8, 0xff);
            case "image/png" -> starts(bytes, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
            case "image/webp" -> ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP");
            case "video/mp4", "audio/mp4" -> ascii(bytes, 4, "ftyp");
            case "audio/mpeg" -> ascii(bytes, 0, "ID3") || (bytes.length > 1 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xe0) == 0xe0);
            case "audio/wav" -> ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WAVE");
            case "audio/webm" -> starts(bytes, 0x1a, 0x45, 0xdf, 0xa3);
            default -> false;
        };
    }

    private boolean starts(byte[] bytes, int... signature) {
        if (bytes.length < signature.length) return false;
        for (int i = 0; i < signature.length; i++) if ((bytes[i] & 0xff) != signature[i]) return false;
        return true;
    }

    private boolean ascii(byte[] bytes, int offset, String value) {
        if (bytes.length < offset + value.length()) return false;
        for (int i = 0; i < value.length(); i++) if (bytes[offset + i] != value.charAt(i)) return false;
        return true;
    }

    public record ValidatedMedia(String fileName, String mediaType, long sizeBytes, String extension) { }
}
