import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { getWithdrawalPreview, withdrawAccount } from '../api/users';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import type { WithdrawalDecision, WithdrawalPreview } from '../types/user';
import styles from './WithdrawPage.module.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; preview: WithdrawalPreview };

type Choice = 'TRANSFER' | 'DELETE';

const LOAD_ERROR = '탈퇴 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
const STALE_ERROR = '당사자 정보가 바뀌었어요. 선택을 처음부터 다시 확인해 주세요.';
const FAILED_ERROR = '탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.';

export function WithdrawPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 늦게 도착한 옛 응답이 최신 미리보기를 덮어쓰지 않도록 마지막 요청만 반영한다
  const latest = useRef(0);

  const reload = async () => {
    const id = ++latest.current;
    try {
      const preview = await getWithdrawalPreview();
      if (id === latest.current) setState({ status: 'ok', preview });
    } catch {
      if (id === latest.current) setState({ status: 'error' });
    }
  };

  useEffect(() => {
    let active = true;
    const id = ++latest.current;
    getWithdrawalPreview()
      .then((preview) => { if (active && id === latest.current) setState({ status: 'ok', preview }); })
      .catch(() => { if (active && id === latest.current) setState({ status: 'error' }); });
    return () => { active = false; };
  }, []);

  const preview = state.status === 'ok' ? state.preview : null;
  // 세컨드가 이어받는 당사자는 선택이 없다. 나머지는 모두 결정해야 한다
  const decidable = preview?.recipients.filter((r) => r.resolution !== 'SUCCESSION') ?? [];
  const ready = preview !== null && decidable.every((r) => choices[r.careRecipientId] !== undefined);
  const role = user?.role;

  const decisions = (): WithdrawalDecision[] =>
    decidable.map((r) => ({ careRecipientId: r.careRecipientId, action: choices[r.careRecipientId] }));

  const submit = async () => {
    if (submitting) return;
    setConfirming(false);
    setSubmitting(true);
    setError(null);
    try {
      await withdrawAccount(decisions());
      logout();
      navigate('/login', { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        // 그 사이 세컨드 지정이나 기관 연결이 바뀐 경우라 선택을 지우고 다시 받는다
        setError(STALE_ERROR);
        setChoices({});
        await reload();
      } else {
        setError(FAILED_ERROR);
      }
      setSubmitting(false);
    }
  };

  const choose = (careRecipientId: number, choice: Choice | undefined) =>
    setChoices((prev) => {
      const next = { ...prev };
      if (choice === undefined) delete next[careRecipientId];
      else next[careRecipientId] = choice;
      return next;
    });

  return (
    <div className="demo-page">
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label="뒤로가기">‹</button>
        <h1 className={styles.title}>회원 탈퇴</h1>
      </div>

      <section className="demo-card">
        <p className={styles.lead}>
          탈퇴하면 이름·이메일·전화번호가 지워지고 로그아웃돼요. 한 번 탈퇴하면 되돌릴 수 없어요.
          같은 이메일로 다시 가입할 수는 있어요.
        </p>
      </section>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {state.status === 'loading' && <p className="muted">불러오는 중…</p>}

      {state.status === 'error' && (
        <section className="demo-card">
          <p className={styles.error} role="alert">{LOAD_ERROR}</p>
          <button type="button" className="btn secondary" onClick={() => { setState({ status: 'loading' }); void reload(); }}>
            다시 불러오기
          </button>
        </section>
      )}

      {preview && preview.endedAssignmentCount > 0 && (role === 'SUPPORT_WORKER' || role === 'INSTITUTION') && (
        <p className={styles.notice}>
          활성 배정 {preview.endedAssignmentCount}건이 종료돼요. 종료되면 해당 당사자의 정보에 바로 접근할 수 없어요.
          {role === 'INSTITUTION' && ' 새 담당자가 기관을 인수한 뒤 배정을 다시 만들어야 해요.'}
        </p>
      )}
      {preview && role === 'SUPPORT_WORKER' && (
        <p className={styles.notice}>기관 소속이 해제돼요. 작성한 기록은 남고 작성자는 "탈퇴한 사용자"로 표시돼요.</p>
      )}
      {preview && role === 'INSTITUTION' && (
        <p className={styles.notice}>
          기관 코드가 새로 바뀌어요. 이전 코드로는 기관을 인수할 수 없고, 운영자가 새 코드를 후임 담당자에게 전달해요.
          소속 지원사와 당사자 연결은 그대로 유지돼요.
        </p>
      )}

      {preview && preview.recipients.length > 0 && (
        <section className="demo-card">
          <h2 className={styles.sectionTitle}>당사자별로 정해 주세요</h2>
          <ul className={styles.list}>
            {preview.recipients.map((r) => (
              <li key={r.careRecipientId} className={styles.card}>
                <p className={styles.name}>{r.name}</p>

                {r.resolution === 'SUCCESSION' && (
                  <p className={styles.hint}>세컨드 보호자가 이어받아요. 선택할 것이 없어요.</p>
                )}

                {r.resolution === 'CHOICE' && (
                  <fieldset className={styles.options}>
                    <legend className="muted" style={{ fontSize: 13, marginBottom: 6 }}>이 당사자의 정보를 어떻게 할까요?</legend>
                    <label className={styles.option}>
                      <input
                        type="radio"
                        name={`choice-${r.careRecipientId}`}
                        checked={choices[r.careRecipientId] === 'TRANSFER'}
                        onChange={() => choose(r.careRecipientId, 'TRANSFER')}
                      />
                      <span className={styles.optionText}>
                        기관에 이관해요
                        <span className={styles.optionDesc}>연결된 기관에 기록이 남아요. 병원·연락처 정보는 지워져요.</span>
                      </span>
                    </label>
                    <label className={styles.option}>
                      <input
                        type="radio"
                        name={`choice-${r.careRecipientId}`}
                        checked={choices[r.careRecipientId] === 'DELETE'}
                        onChange={() => choose(r.careRecipientId, 'DELETE')}
                      />
                      <span className={styles.optionText}>
                        삭제해요
                        <span className={styles.optionDesc}>바로 접근이 막히고 30일 뒤 기록과 사진·영상이 모두 지워져요.</span>
                      </span>
                    </label>
                  </fieldset>
                )}

                {r.resolution === 'DELETE_ONLY' && (
                  <>
                    <p className={styles.hint}>연결된 기관이 없어 삭제만 할 수 있어요.</p>
                    <label className={styles.option}>
                      <input
                        type="checkbox"
                        checked={choices[r.careRecipientId] === 'DELETE'}
                        onChange={(e) => choose(r.careRecipientId, e.target.checked ? 'DELETE' : undefined)}
                      />
                      <span className={styles.optionText}>
                        이 당사자의 정보를 삭제해요
                        <span className={styles.optionDesc}>30일 뒤 기록과 사진·영상이 모두 지워져요.</span>
                      </span>
                    </label>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {preview && (
        <div className={styles.actions}>
          <button
            type="button"
            className="btn danger"
            disabled={!ready || submitting}
            onClick={() => setConfirming(true)}
          >
            {submitting ? '처리 중…' : '탈퇴하기'}
          </button>
          {!ready && <p className={styles.hint}>모든 당사자의 처리 방법을 골라야 탈퇴할 수 있어요.</p>}
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="정말 탈퇴할까요?"
        description="탈퇴하면 되돌릴 수 없어요. 계정 정보가 지워지고 로그아웃돼요."
        confirmLabel="탈퇴하기"
        variant="danger"
        onCancel={() => setConfirming(false)}
        onConfirm={() => void submit()}
      />
    </div>
  );
}
