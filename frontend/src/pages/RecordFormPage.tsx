import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRecord, createRecordDraft, deleteRecordMedia, uploadRecordAudio } from '../api/records';
import { useAuth } from '../contexts/AuthContext';
import type { RecordCategory } from '../types/record';
import styles from './RecordFormPage.module.css';

const CATEGORIES: { id: RecordCategory; label: string }[] = [
  { id: 'COMMUNICATION', label: '의사소통' }, { id: 'LIFESTYLE', label: '생활습관' },
  { id: 'MEAL', label: '식사' }, { id: 'PREFERENCE', label: '선호·비선호' },
  { id: 'CHALLENGING_BEHAVIOR', label: '도전행동' }, { id: 'HEALTH', label: '건강·복약' },
  { id: 'EMERGENCY', label: '위기대처' }, { id: 'OTHER', label: '기타' },
];

function formatToday() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export function RecordFormPage() {
  const { selectedRecipientId, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [stage, setStage] = useState<'input' | 'review'>('input');
  const [text, setText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<RecordCategory>('OTHER');
  const [showInCareInfo, setShowInCareInfo] = useState(false);
  const [recording, setRecording] = useState(false);
  const [requestingMic, setRequestingMic] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orphanedMediaId, setOrphanedMediaId] = useState<number | null>(null);
  const [cleanupPending, setCleanupPending] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);
  const discardRecordingRef = useRef(false);
  const durationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      discardRecordingRef.current = true;
      if (durationTimerRef.current) clearTimeout(durationTimerRef.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  const prepareDraft = (draft: { transcript: string; content: string; category: RecordCategory }) => {
    setTranscript(draft.transcript);
    setContent(draft.content);
    setCategory(draft.category);
    setStage('review');
  };

  const createTextDraft = async () => {
    if (!selectedRecipientId) {
      setError('당사자 정보를 확인할 수 없어요. 홈으로 돌아가 다시 시도해 주세요.');
      return;
    }
    if (!text.trim()) {
      setError('기록할 내용을 입력해 주세요.');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      prepareDraft(await createRecordDraft(selectedRecipientId, { inputType: 'TEXT', text: text.trim() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 초안을 만들지 못했어요. 입력한 내용은 그대로 남아 있어요.');
    } finally {
      setProcessing(false);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('이 브라우저에서는 음성 녹음을 사용할 수 없어요. 텍스트 입력을 이용해 주세요.');
      return;
    }
    setError(null);
    setRequestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      discardRecordingRef.current = false;
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find(type => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        if (durationTimerRef.current) clearTimeout(durationTimerRef.current);
        stopStream();
        if (!mountedRef.current || discardRecordingRef.current) {
          discardRecordingRef.current = false;
          return;
        }
        setRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        void createAudioDraft(blob);
      };
      recorder.onerror = () => {
        discardRecordingRef.current = true;
        if (recorder.state === 'recording') recorder.stop();
        setRecording(false);
        stopStream();
        setProcessing(false);
        setError('녹음 중 문제가 발생했어요. 다시 시도해 주세요.');
      };
      recorderRef.current = recorder;
      recorder.start();
      setRequestingMic(false);
      setRecording(true);
      durationTimerRef.current = setTimeout(() => recorder.stop(), 10 * 60 * 1000);
    } catch {
      stopStream();
      setRequestingMic(false);
      setError('마이크를 사용할 수 없어요. 권한을 확인하거나 텍스트 입력을 이용해 주세요.');
    }
  };

  const createAudioDraft = async (blob: Blob) => {
    if (!selectedRecipientId) {
      setError('당사자 정보를 확인할 수 없어요. 홈으로 돌아가 다시 시도해 주세요.');
      return;
    }
    const mediaType = blob.type.split(';')[0] || 'audio/webm';
    if (!['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm'].includes(mediaType)) {
      setError('지원하지 않는 녹음 형식이에요. 다시 녹음하거나 텍스트 입력을 이용해 주세요.');
      return;
    }
    const extension = mediaType === 'audio/mp4' ? 'm4a' : mediaType === 'audio/wav' ? 'wav' : 'webm';
    let mediaId: number | null = null;
    setProcessing(true);
    setError(null);
    try {
      const upload = await uploadRecordAudio(selectedRecipientId, new File([blob], `recording.${extension}`, { type: mediaType }));
      mediaId = upload.mediaId;
      const draft = await createRecordDraft(selectedRecipientId, { inputType: 'AUDIO', mediaId });
      prepareDraft(draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : '음성을 정리하지 못했어요. 다시 녹음하거나 텍스트를 입력해 주세요.');
    } finally {
      if (mediaId !== null) {
        try {
          await deleteRecordMedia(selectedRecipientId, mediaId);
        } catch {
          setOrphanedMediaId(mediaId);
          setCleanupError('임시 녹음 파일을 삭제하지 못했어요. 다시 시도해 주세요.');
        }
      }
      setProcessing(false);
    }
  };

  const retryAudioCleanup = async () => {
    if (!selectedRecipientId || orphanedMediaId === null) return;
    setCleanupPending(true);
    try {
      await deleteRecordMedia(selectedRecipientId, orphanedMediaId);
      setOrphanedMediaId(null);
      setCleanupError(null);
    } catch {
      setCleanupError('녹음 파일 삭제에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.');
    } finally {
      setCleanupPending(false);
    }
  };

  const saveRecord = async () => {
    if (!selectedRecipientId || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createRecord(selectedRecipientId, {
        content: content.trim(), category, recordedAt: new Date().toISOString(), pinned: showInCareInfo,
      });
      navigate('/records');
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 중 오류가 발생했어요. 입력한 내용은 그대로 남아 있어요.');
    } finally {
      setSaving(false);
    }
  };

  const stopRecording = () => {
    if (durationTimerRef.current) clearTimeout(durationTimerRef.current);
    recorderRef.current?.stop();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} disabled={recording || requestingMic || processing || saving || orphanedMediaId !== null} onClick={() => stage === 'review' ? setStage('input') : navigate(-1)} aria-label="뒤로가기">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 19l-7-7 7-7" stroke="#1a2533" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className={styles.title}>{stage === 'review' ? 'AI 정리 확인' : '기록 작성'}</h1>
        <div className={styles.headerRight} />
      </header>

      <div className={styles.body}>
        <p className={styles.dateLabel}>{formatToday()}</p>
        {stage === 'input' ? (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>어떤 방식으로 기록할까요?</h2>
              <div className={styles.modeSwitch} role="group" aria-label="입력 방식 선택">
                <button type="button" disabled={requestingMic || recording || processing} aria-pressed={mode === 'voice'} className={mode === 'voice' ? styles.modeActive : ''} onClick={() => { setMode('voice'); setError(null); }}>음성으로 기록하기</button>
                <button type="button" disabled={requestingMic || recording || processing} aria-pressed={mode === 'text'} className={mode === 'text' ? styles.modeActive : ''} onClick={() => { setMode('text'); setError(null); }}>텍스트로 기록하기</button>
              </div>
            </section>
            {mode === 'voice' ? (
              <section className={styles.voicePanel}>
                <div className={styles.micIcon} aria-hidden="true">{recording ? '●' : '🎙'}</div>
                <h2>{recording ? '말씀해 주세요' : '오늘 있었던 일을 들려주세요'}</h2>
                <p>{recording ? '녹음을 마치면 AI가 내용을 정리해요.' : '녹음한 음성은 AI가 글로 정리하고 유형을 분류해요.'}</p>
                <button className={recording ? styles.stopButton : styles.recordButton} type="button" disabled={processing || requestingMic || (orphanedMediaId !== null && !recording) || cleanupPending} onClick={() => recording ? stopRecording() : void startRecording()}>
                  {recording ? '녹음 마치기' : orphanedMediaId !== null ? '먼저 녹음 파일을 삭제해 주세요' : requestingMic ? '마이크 권한 확인 중…' : processing ? 'AI가 정리하고 있어요…' : '녹음 시작하기'}
                </button>
                <p className={styles.privacyNote}>녹음 파일은 AI 정리 후 삭제를 요청해요. 확인한 내용만 기록으로 저장돼요.</p>
              </section>
            ) : (
              <section className={styles.section}>
                <label className={styles.sectionTitle} htmlFor="record-input">오늘 있었던 일을 편하게 적어주세요</label>
                <textarea id="record-input" aria-label="기록할 내용" className={styles.textarea} placeholder="예: 아침 식사 후 산책을 다녀왔어요." value={text} onChange={e => setText(e.target.value)} rows={7} maxLength={3000} />
                <p className={styles.charCount}>{text.length} / 3,000</p>
                <button type="button" className={styles.draftButton} disabled={!text.trim() || processing} onClick={() => { void createTextDraft(); }}>{processing ? 'AI가 정리하고 있어요…' : 'AI로 정리하기'}</button>
              </section>
            )}
          </>
        ) : (
          <>
            <section className={styles.reviewCard}>
              <h2>AI가 이렇게 정리했어요</h2>
              <p>내용을 확인하고 필요한 부분을 고쳐 주세요.</p>
              {transcript && transcript !== text && <details><summary>음성 인식 내용 보기</summary><p>{transcript}</p></details>}
              <label htmlFor="record-review">정리된 기록</label>
              <textarea id="record-review" aria-label="정리된 기록" className={styles.textarea} value={content} onChange={e => setContent(e.target.value)} rows={6} maxLength={500} />
              <p className={styles.charCount}>{content.length} / 500</p>
            </section>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>AI 분류 · 필요하면 바꿀 수 있어요</h2>
              <div className={styles.chips} role="group" aria-label="기록 유형 선택">
                {CATEGORIES.map(cat => <button key={cat.id} type="button" aria-pressed={category === cat.id} className={`${styles.chip} ${category === cat.id ? styles.chipActive : ''}`} onClick={() => setCategory(cat.id)}>{cat.label}</button>)}
              </div>
            </section>
            {user?.role === 'GUARDIAN' && (
              <section className={styles.pinSection}>
                <label className={styles.pinLabel} htmlFor="show-in-care-info">
                  <input
                    id="show-in-care-info"
                    type="checkbox"
                    checked={showInCareInfo}
                    onChange={event => setShowInCareInfo(event.target.checked)}
                  />
                  돌봄정보에도 표시
                </label>
                <p>선택하면 돌봄정보의 중요 생활기록에 함께 표시돼요.</p>
              </section>
            )}
          </>
        )}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {cleanupError && <div className={styles.cleanupWarning}>
          <p role="alert" className={styles.error}>{cleanupError}</p>
          <button type="button" disabled={cleanupPending} onClick={() => { void retryAudioCleanup(); }}>
            {cleanupPending ? '삭제 중…' : '녹음 파일 삭제 다시 시도'}
          </button>
        </div>}
      </div>

      {stage === 'review' && <div className={styles.footer}>
        <button type="button" className={styles.saveButton} disabled={!content.trim() || processing || saving || orphanedMediaId !== null} onClick={() => { void saveRecord(); }}>{processing ? '임시 녹음 정리 중…' : saving ? '저장 중…' : '기록 저장하기'}</button>
      </div>}
    </div>
  );
}
