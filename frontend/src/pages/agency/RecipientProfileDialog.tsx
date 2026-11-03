import { useEffect, useState } from 'react';
import { listRoutines } from '../../api/routines';
import { DISABILITY_SEVERITY_LABELS, formatContactLine } from '../../types/careRecipient';
import type { OrganizationCareRecipient } from '../../types/agency';
import type { Routine } from '../../types/routine';

const GENDER_LABEL: Record<string, string> = { MALE: '남', FEMALE: '여' };
const DISABILITY_LABEL: Record<string, string> = {
  INTELLECTUAL: '지적 장애',
  AUTISM: '자폐성 장애',
  OTHER: '그 외 장애',
};
const EMPTY = '등록된 정보가 없어요.';

export function RecipientProfileDialog({
  recipient,
  onClose,
}: {
  recipient: OrganizationCareRecipient;
  onClose: () => void;
}) {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [routineError, setRoutineError] = useState(false);

  useEffect(() => {
    let current = true;
    setRoutines(null);
    setRoutineError(false);
    listRoutines(recipient.id)
      .then(items => { if (current) setRoutines(items); })
      .catch(() => { if (current) setRoutineError(true); });
    return () => { current = false; };
  }, [recipient.id]);

  const disabilityTypes = (recipient.disabilityTypes ?? [])
    .map(type => (type === 'OTHER' && recipient.otherDisabilityType
      ? `${DISABILITY_LABEL[type]}(${recipient.otherDisabilityType})`
      : DISABILITY_LABEL[type] ?? type))
    .join(', ');
  const hospital = formatContactLine(recipient.hospitalName, recipient.doctorName, recipient.hospitalPhone);
  const center = formatContactLine(
    recipient.supportCenterName, recipient.supportCenterManagerName, recipient.supportCenterPhone);
  const guardian = recipient.guardianName
    ? `${recipient.guardianName}${recipient.guardianPhone ? ` (${recipient.guardianPhone})` : ''}`
    : null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.45)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 12, boxSizing: 'border-box',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="돌봄 당사자 프로필"
        className="demo-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 360, width: '100%', maxHeight: '88vh', overflowY: 'auto', background: '#fff',
          borderRadius: 14, padding: '20px 16px', boxSizing: 'border-box',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>돌봄 당사자 프로필</h2>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px' }}>
          <dt className="muted">이름</dt><dd style={{ margin: 0 }}>{recipient.name}</dd>
          <dt className="muted">고유번호</dt><dd style={{ margin: 0 }}>{recipient.careRecipientNumber || `#${recipient.id}`}</dd>
          <dt className="muted">생년월일</dt>
          <dd style={{ margin: 0 }}>
            {recipient.birthDate
              ? `${recipient.birthDate}${GENDER_LABEL[recipient.gender] ? ` (${GENDER_LABEL[recipient.gender]})` : ''}`
              : EMPTY}
          </dd>
          <dt className="muted">장애 유형</dt><dd style={{ margin: 0 }}>{disabilityTypes || EMPTY}</dd>
          <dt className="muted">장애 정도</dt>
          <dd style={{ margin: 0 }}>
            {recipient.disabilitySeverity ? DISABILITY_SEVERITY_LABELS[recipient.disabilitySeverity] : EMPTY}
          </dd>
          <dt className="muted">주치의·병원</dt><dd style={{ margin: 0 }}>{hospital ?? EMPTY}</dd>
          <dt className="muted">활동지원센터</dt><dd style={{ margin: 0 }}>{center ?? EMPTY}</dd>
          <dt className="muted">보호자</dt><dd style={{ margin: 0 }}>{guardian ?? EMPTY}</dd>
        </dl>
        <h3 style={{ fontSize: '1rem', margin: '16px 0 6px' }}>하루 루틴</h3>
        {routineError ? (
          <p role="alert" className="error" style={{ margin: 0 }}>루틴을 불러오지 못했어요.</p>
        ) : routines === null ? (
          <p className="muted" style={{ margin: 0 }}>불러오는 중…</p>
        ) : routines.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>등록된 루틴이 없어요.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {routines.map(routine => (
              <li key={routine.id}>
                <strong>{routine.time}</strong> {routine.title}
                {routine.memo && <span className="muted"> · {routine.memo}</span>}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
