package com.project.backend.ai;

import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.record.entity.CareInfo;
import com.project.backend.record.entity.CareInfoCategory;
import com.project.backend.record.media.RecordMedia;
import com.project.backend.record.media.RecordMediaRepository;
import com.project.backend.record.repository.CareInfoRepository;
import com.project.backend.record.repository.DailyRecordRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import com.openai.client.OpenAIClient;
import com.openai.models.audio.AudioResponseFormat;
import com.openai.models.audio.AudioModel;
import com.openai.models.audio.transcriptions.TranscriptionCreateParams;
import com.openai.models.audio.transcriptions.TranscriptionCreateResponse;
import com.openai.models.audio.transcriptions.TranscriptionVerbose;
import com.openai.models.chat.completions.*;
import com.openai.services.blocking.AudioService;
import com.openai.services.blocking.ChatService;
import com.openai.services.blocking.audio.TranscriptionService;
import com.openai.services.blocking.chat.ChatCompletionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Transactional
class RecordDraftApiTest {
    static final Instant NOW = Instant.parse("2026-10-14T03:00:00Z");
    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @Autowired CareRecipientRepository recipients;
    @Autowired CareGuardianRepository guardians;
    @Autowired RecordMediaRepository media;
    @Autowired CareInfoRepository careInfos;
    @Autowired DailyRecordRepository records;
    @MockitoBean Clock clock;
    @MockitoBean OpenAIClient openAI;
    @MockitoBean S3Client s3;
    MockMvc mvc;
    User guardian;
    CareRecipient recipient;
    CareRecipient otherRecipient;
    ChatCompletionService completions;
    ChatCompletion completion;
    TranscriptionService transcriptions;
    ChatCompletionMessage gptMessage;
    User outsider;

    @BeforeEach
    void setUp() {
        given(clock.instant()).willReturn(NOW);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        guardian = users.save(User.builder().name("guardian").email("guardian@test.invalid")
                .publicCode("P-guardian").role(UserRole.GUARDIAN).build());
        recipient = recipients.save(CareRecipient.builder().name("당사자").careRecipientNumber("R-00000001")
                .birthDate(LocalDate.of(2000, 1, 1)).gender(Gender.MALE).build());
        guardians.save(CareGuardian.builder().careRecipientId(recipient.getId()).guardianId(guardian.getId())
                .type(GuardianType.PRIMARY).status(GuardianStatus.ACTIVE).build());
        otherRecipient = recipients.save(CareRecipient.builder().name("다른 당사자").careRecipientNumber("R-00000002")
                .birthDate(LocalDate.of(2000, 1, 1)).gender(Gender.FEMALE).build());
        guardians.save(CareGuardian.builder().careRecipientId(otherRecipient.getId()).guardianId(guardian.getId())
                .type(GuardianType.PRIMARY).status(GuardianStatus.ACTIVE).build());
        outsider = users.save(User.builder().name("outsider").email("outsider@test.invalid")
                .publicCode("P-outsider").role(UserRole.GUARDIAN).build());

        ChatService chat = mock(ChatService.class);
        completions = mock(ChatCompletionService.class);
        completion = mock(ChatCompletion.class);
        ChatCompletion.Choice choice = mock(ChatCompletion.Choice.class);
        gptMessage = mock(ChatCompletionMessage.class);
        given(openAI.chat()).willReturn(chat);
        given(chat.completions()).willReturn(completions);
        given(completions.create(any(ChatCompletionCreateParams.class))).willReturn(completion);
        given(completion.choices()).willReturn(List.of(choice));
        given(choice.message()).willReturn(gptMessage);
        given(gptMessage.content()).willReturn(Optional.of("{\"content\":\"아침 식사를 마쳤습니다.\",\"category\":\"MEAL\"}"));

        AudioService audio = mock(AudioService.class);
        transcriptions = mock(TranscriptionService.class);
        given(openAI.audio()).willReturn(audio);
        given(audio.transcriptions()).willReturn(transcriptions);
        var transcriptionResponse = mock(TranscriptionCreateResponse.class);
        var transcription = mock(TranscriptionVerbose.class);
        given(transcriptions.create(any(TranscriptionCreateParams.class))).willReturn(transcriptionResponse);
        given(transcriptionResponse.asVerbose()).willReturn(transcription);
        given(transcription.duration()).willReturn(2.0);
        given(transcription.text()).willReturn("아침 식사 후 약을 복용했습니다.");
    }

    @Test
    void textInputReturnsAnUnpersistedRecordDraft() throws Exception {
        CareInfo careInfo = new CareInfo(recipient.getId(), CareInfoCategory.COMMUNICATION);
        careInfo.update("낯선 장소에서는 천천히 설명하면 안정됩니다.", NOW);
        careInfos.save(careInfo);

        mvc.perform(post("/api/ai/record-drafts").contentType("application/json")
                        .content(textRequest("아침을 먹고 약을 복용했습니다."))
                        .with(authentication(auth(guardian))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.transcript").value("아침을 먹고 약을 복용했습니다."))
                .andExpect(jsonPath("$.data.content").value("아침 식사를 마쳤습니다."))
                .andExpect(jsonPath("$.data.category").value("MEAL"));
        org.mockito.ArgumentCaptor<ChatCompletionCreateParams> params = org.mockito.ArgumentCaptor.forClass(ChatCompletionCreateParams.class);
        verify(completions).create(params.capture());
        org.assertj.core.api.Assertions.assertThat(params.getValue().toString())
                .contains("낯선 장소에서는 천천히 설명하면 안정됩니다.");
        org.assertj.core.api.Assertions.assertThat(params.getValue().responseFormat().orElseThrow().isJsonSchema()).isTrue();
        org.assertj.core.api.Assertions.assertThat(params.getValue().responseFormat().orElseThrow()
                .asJsonSchema().jsonSchema().strict()).contains(true);
        org.assertj.core.api.Assertions.assertThat(records.count()).isZero();
    }

    @Test
    void invalidTextInputIsRejectedBeforeCallingOpenAi() throws Exception {
        mvc.perform(post("/api/ai/record-drafts").contentType("application/json")
                        .content(textRequest("   ")).with(authentication(auth(guardian))))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/ai/record-drafts").contentType("application/json")
                        .content(textRequest("가".repeat(3001)))
                        .with(authentication(auth(guardian))))
                .andExpect(status().isUnprocessableEntity());
        org.mockito.Mockito.verify(completions, org.mockito.Mockito.never()).create(any(ChatCompletionCreateParams.class));
    }

    @Test
    void audioInputIsAuthorizedTranscribedAndReturnedWithoutPersistence() throws Exception {
        byte[] wav = wav(2);
        CareInfo careInfo = new CareInfo(recipient.getId(), CareInfoCategory.PREFERENCE);
        careInfo.update("식사는 작은 양으로 나누어 제공하면 편안해합니다.", NOW);
        careInfos.save(careInfo);
        RecordMedia audio = media.save(new RecordMedia(recipient.getId(), guardian.getId(), "voice.wav", "audio/wav", wav.length,
                "media/" + recipient.getId() + "/voice.wav", NOW));
        given(s3.getObjectAsBytes(any(GetObjectRequest.class))).willReturn(ResponseBytes.fromByteArray(
                GetObjectResponse.builder().build(), wav));

        mvc.perform(post("/api/ai/record-drafts").contentType("application/json")
                        .content(audioRequest(recipient.getId(), audio.getId()))
                        .with(authentication(auth(guardian))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.transcript").value("아침 식사 후 약을 복용했습니다."))
                .andExpect(jsonPath("$.data.category").value("MEAL"));
        org.mockito.ArgumentCaptor<TranscriptionCreateParams> params = org.mockito.ArgumentCaptor.forClass(TranscriptionCreateParams.class);
        verify(transcriptions).create(params.capture());
        org.assertj.core.api.Assertions.assertThat(params.getValue().model()).isEqualTo(AudioModel.WHISPER_1);
        org.assertj.core.api.Assertions.assertThat(params.getValue().responseFormat()).contains(AudioResponseFormat.VERBOSE_JSON);
        org.mockito.ArgumentCaptor<ChatCompletionCreateParams> chatParams = org.mockito.ArgumentCaptor.forClass(ChatCompletionCreateParams.class);
        verify(completions).create(chatParams.capture());
        org.assertj.core.api.Assertions.assertThat(chatParams.getValue().toString())
                .contains("식사는 작은 양으로 나누어 제공하면 편안해합니다.")
                .contains("아침 식사 후 약을 복용했습니다.");
        org.assertj.core.api.Assertions.assertThat(records.count()).isZero();
    }

    @Test
    void audioLongerThanTenMinutesIsRejectedBeforeDraftGeneration() throws Exception {
        byte[] wav = wav(601);
        RecordMedia audio = media.save(new RecordMedia(recipient.getId(), guardian.getId(), "long.wav", "audio/wav", wav.length,
                "media/" + recipient.getId() + "/long.wav", NOW));
        given(s3.getObjectAsBytes(any(GetObjectRequest.class))).willReturn(ResponseBytes.fromByteArray(
                GetObjectResponse.builder().build(), wav));
        var transcriptionResponse = mock(TranscriptionCreateResponse.class);
        var transcription = mock(TranscriptionVerbose.class);
        given(transcriptions.create(any(TranscriptionCreateParams.class))).willReturn(transcriptionResponse);
        given(transcriptionResponse.asVerbose()).willReturn(transcription);
        given(transcription.duration()).willReturn(601.0);

        mvc.perform(post("/api/ai/record-drafts").contentType("application/json")
                        .content(audioRequest(recipient.getId(), audio.getId())).with(authentication(auth(guardian))))
                .andExpect(status().isUnprocessableEntity());

        verify(transcriptions).create(any(TranscriptionCreateParams.class));
        org.mockito.Mockito.verify(completions, org.mockito.Mockito.never()).create(any(ChatCompletionCreateParams.class));
    }

    @Test
    void audioMustBeReadableAudioAndWithinProviderSizeLimit() throws Exception {
        RecordMedia audio = media.save(new RecordMedia(recipient.getId(), guardian.getId(), "voice.mp3", "audio/mpeg", 25_000_001,
                "media/" + recipient.getId() + "/voice.mp3", NOW));
        RecordMedia image = media.save(new RecordMedia(recipient.getId(), guardian.getId(), "photo.jpg", "image/jpeg", 4,
                "media/" + recipient.getId() + "/photo.jpg", NOW));
        mvc.perform(post("/api/ai/record-drafts").contentType("application/json")
                        .content(audioRequest(recipient.getId(), audio.getId()))
                        .with(authentication(auth(guardian))))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/ai/record-drafts").contentType("application/json")
                        .content(audioRequest(recipient.getId(), audio.getId()))
                        .with(authentication(auth(outsider))))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/ai/record-drafts").contentType("application/json")
                        .content(audioRequest(recipient.getId(), image.getId()))
                        .with(authentication(auth(guardian))))
                .andExpect(status().isUnprocessableEntity());
        org.mockito.Mockito.verify(s3, org.mockito.Mockito.never()).getObjectAsBytes(any(GetObjectRequest.class));
        org.mockito.Mockito.verify(transcriptions, org.mockito.Mockito.never()).create(any(TranscriptionCreateParams.class));
    }

    @Test
    void invalidAiCategoryIsNotReturnedToTheClient() throws Exception {
        given(gptMessage.content()).willReturn(Optional.of("{\"content\":\"기록\",\"category\":\"UNKNOWN\"}"));
        mvc.perform(post("/api/ai/record-drafts").contentType("application/json")
                        .content(textRequest("관찰 내용"))
                        .with(authentication(auth(guardian))))
                .andExpect(status().isBadGateway()).andExpect(jsonPath("$.error.code").value("AI_INVALID_RESPONSE"));
        org.assertj.core.api.Assertions.assertThat(records.count()).isZero();
    }

    @Test
    void textDraftRequiresAnAccessibleCareRecipient() throws Exception {
        mvc.perform(post("/api/ai/record-drafts").contentType("application/json")
                        .content("{\"inputType\":\"TEXT\",\"text\":\"관찰 내용\"}")
                        .with(authentication(auth(guardian))))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/ai/record-drafts").contentType("application/json")
                        .content(textRequest("관찰 내용")).with(authentication(auth(outsider))))
                .andExpect(status().isForbidden());
        org.mockito.Mockito.verify(completions, org.mockito.Mockito.never()).create(any(ChatCompletionCreateParams.class));
    }

    @Test
    void audioMediaMustBelongToTheRequestedCareRecipient() throws Exception {
        RecordMedia audio = media.save(new RecordMedia(recipient.getId(), guardian.getId(), "voice.mp3", "audio/mpeg", 4,
                "media/" + recipient.getId() + "/voice.mp3", NOW));
        mvc.perform(post("/api/ai/record-drafts").contentType("application/json")
                        .content(audioRequest(otherRecipient.getId(), audio.getId()))
                        .with(authentication(auth(guardian))))
                .andExpect(status().isNotFound());
        org.mockito.Mockito.verify(s3, org.mockito.Mockito.never()).getObjectAsBytes(any(GetObjectRequest.class));
    }

    private String textRequest(String text) {
        return "{\"careRecipientId\":" + recipient.getId() + ",\"inputType\":\"TEXT\",\"text\":\"" + text + "\"}";
    }

    private String audioRequest(Long careRecipientId, Long mediaId) {
        return "{\"careRecipientId\":" + careRecipientId + ",\"inputType\":\"AUDIO\",\"mediaId\":" + mediaId + "}";
    }

    private byte[] wav(int seconds) {
        int sampleRate = 8000;
        int dataSize = sampleRate * 2 * seconds;
        java.nio.ByteBuffer buffer = java.nio.ByteBuffer.allocate(44 + dataSize).order(java.nio.ByteOrder.LITTLE_ENDIAN);
        buffer.put("RIFF".getBytes()).putInt(36 + dataSize).put("WAVEfmt ".getBytes()).putInt(16)
                .putShort((short) 1).putShort((short) 1).putInt(sampleRate).putInt(sampleRate * 2)
                .putShort((short) 2).putShort((short) 16).put("data".getBytes()).putInt(dataSize);
        return buffer.array();
    }

    private org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth(User user) {
        return new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(user.getId(), null, List.of());
    }
}
