package com.project.backend.record.media;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MediaFileValidatorTest {
    private final MediaFileValidator validator = new MediaFileValidator();

    @Test
    void acceptsJpegWhenDeclaredTypeMatchesItsSignature() {
        var file = new MockMultipartFile("file", "photo.jpg", "image/jpeg",
                new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff, 0x01});

        assertThat(validator.validate(file).extension()).isEqualTo("jpg");
    }

    @Test
    void rejectsDisallowedTypesAndMimeSpoofing() {
        var executable = new MockMultipartFile("file", "payload.exe", "application/octet-stream", new byte[]{1});
        var fakeImage = new MockMultipartFile("file", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3});

        assertThatThrownBy(() -> validator.validate(executable)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> validator.validate(fakeImage)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsFilesLargerThanFiftyMegabytes() {
        var oversized = new OversizedMultipartFile();

        assertThatThrownBy(() -> validator.validate(oversized)).isInstanceOf(IllegalArgumentException.class);
    }

    private static class OversizedMultipartFile extends MockMultipartFile {
        OversizedMultipartFile() { super("file", "large.jpg", "image/jpeg", new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff}); }
        @Override public long getSize() { return 50L * 1024 * 1024 + 1; }
    }
}
