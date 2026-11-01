import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCareRecipient, updateCareRecipient } from '../api/careRecipients';
import { createRoutine, deleteRoutine, listRoutines, updateRoutine } from '../api/routines';
import {
  DISABILITY_SEVERITY_LABELS,
  formatContactLine,
  type CareRecipient,
  type DisabilitySeverity,
} from '../types/careRecipient';
import type { Routine } from '../types/routine';
import styles from './ProfilePage.module.css';

const GENDER_LABEL = { MALE: '남', FEMALE: '여' } as const;

function sortRoutines(items: Routine[]): Routine[] {
  return [...items].sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id);
}

export function ProfilePage() {
  const { user, selectedRecipientId } = useAuth();
  const navigate = useNavigate();
  const canEdit = user?.role === 'GUARDIAN';

  const [recipient, setRecipient] = useState<CareRecipient | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [severity, setSeverity] = useState<DisabilitySeverity | null>(null);
  const [hospitalName, setHospitalName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');
  const [supportCenterName, setSupportCenterName] = useState('');
  const [supportCenterManagerName, setSupportCenterManagerName] = useState('');
  const [supportCenterPhone, setSupportCenterPhone] = useState('');

  const [routineTime, setRoutineTime] = useState('');
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineMemo, setRoutineMemo] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [routineBusy, setRoutineBusy] = useState(false);

  const applyRecipient = (data: CareRecipient) => {
    setRecipient(data);
    setSeverity(data.disabilitySeverity ?? null);
    setHospitalName(data.hospitalName ?? '');
    setDoctorName(data.doctorName ?? '');
    setHospitalPhone(data.hospitalPhone ?? '');
    setSupportCenterName(data.supportCenterName ?? '');
    setSupportCenterManagerName(data.supportCenterManagerName ?? '');
    setSupportCenterPhone(data.supportCenterPhone ?? '');
  };

  useEffect(() => {
    if (!selectedRecipientId) return;
    let current = true;
    // 이전 당사자의 폼이 남아 새 당사자 id로 저장되지 않도록 먼저 비운다
    setRecipient(null);
    setRoutines([]);
    setError(null);
    setSaved(false);
    setEditingId(null);
    setRoutineTime('');
    setRoutineTitle('');
    setRoutineMemo('');
    setLoading(true);
    Promise.all([getCareRecipient(selectedRecipientId), listRoutines(selectedRecipientId)])
      .then(([data, items]) => {
        if (!current) return;
        applyRecipient(data);
        setRoutines(sortRoutines(items));
      })
      .catch(e => { if (current) setError(e instanceof Error ? e.message : '불러오기 실패'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [selectedRecipientId]);

  const saveProfile = async () => {
    if (!selectedRecipientId || !recipient) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateCareRecipient(selectedRecipientId, {
        disabilitySeverity: severity,
        otherDisabilityType: recipient.otherDisabilityType ?? null,
        hospitalName: hospitalName.trim(),
        doctorName: doctorName.trim(),
        hospitalPhone: hospitalPhone.trim(),
        supportCenterName: supportCenterName.trim(),
        supportCenterManagerName: supportCenterManagerName.trim(),
        supportCenterPhone: supportCenterPhone.trim(),
      });
      applyRecipient(updated);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const resetRoutineForm = () => {
    setRoutineTime('');
    setRoutineTitle('');
    setRoutineMemo('');
    setEditingId(null);
  };

  const submitRoutine = async () => {
    if (!selectedRecipientId) return;
    if (!routineTime || !routineTitle.trim()) {
      setError('시간과 제목을 입력해 주세요.');
      return;
    }
    const payload = { time: routineTime, title: routineTitle.trim(), memo: routineMemo.trim() || null };
    setRoutineBusy(true);
    setError(null);
    try {
      if (editingId === null) {
        const created = await createRoutine(selectedRecipientId, payload);
        setRoutines(prev => sortRoutines([...prev, created]));
      } else {
        const updated = await updateRoutine(selectedRecipientId, editingId, payload);
        setRoutines(prev => sortRoutines(prev.map(r => (r.id === updated.id ? updated : r))));
      }
      resetRoutineForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : '루틴 저장 실패');
    } finally {
      setRoutineBusy(false);
    }
  };

  const startEdit = (routine: Routine) => {
    setEditingId(routine.id);
    setRoutineTime(routine.time);
    setRoutineTitle(routine.title);
    setRoutineMemo(routine.memo ?? '');
    setError(null);
  };

  const removeRoutine = async (routine: Routine) => {
    if (!selectedRecipientId) return;
    setError(null);
    try {
      await deleteRoutine(selectedRecipientId, routine.id);
      setRoutines(prev => prev.filter(r => r.id !== routine.id));
      if (editingId === routine.id) resetRoutineForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : '루틴 삭제 실패');
    }
  };

  const hospitalLine = formatContactLine(recipient?.hospitalName, recipient?.doctorName, recipient?.hospitalPhone);
  const centerLine = formatContactLine(
    recipient?.supportCenterName, recipient?.supportCenterManagerName, recipient?.supportCenterPhone);

  return (
    <div className="demo-page">
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label="뒤로가기">‹</button>
        <h1 className={styles.title}>당사자 프로필</h1>
      </div>

      {loading && <p className="muted">불러오는 중…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {recipient && (
        <>
          <section className="demo-card">
            <p className={styles.name}>{recipient.name}</p>
            {recipient.birthDate && (
              <p className="muted" style={{ margin: 0 }}>
                {recipient.birthDate}{recipient.gender ? ` (${GENDER_LABEL[recipient.gender]})` : ''}
              </p>
            )}
          </section>

          <section className="demo-card">
            <h2 className={styles.sectionTitle}>장애 정도</h2>
            {canEdit ? (
              <fieldset className={styles.radios}>
                {(Object.keys(DISABILITY_SEVERITY_LABELS) as DisabilitySeverity[]).map(value => (
                  <label key={value}>
                    <input type="radio" name="disabilitySeverity" checked={severity === value} onChange={() => setSeverity(value)} />
                    {DISABILITY_SEVERITY_LABELS[value]}
                  </label>
                ))}
              </fieldset>
            ) : (
              <p className={styles.readValue}>
                {recipient.disabilitySeverity ? DISABILITY_SEVERITY_LABELS[recipient.disabilitySeverity] : '등록된 정보가 없어요.'}
              </p>
            )}
          </section>

          <section className="demo-card">
            <h2 className={styles.sectionTitle}>주치의·병원</h2>
            {canEdit ? (
              <>
                <label className={styles.field}>병원명<input value={hospitalName} maxLength={100} onChange={e => setHospitalName(e.target.value)} /></label>
                <label className={styles.field}>주치의 이름<input value={doctorName} maxLength={50} onChange={e => setDoctorName(e.target.value)} /></label>
                <label className={styles.field}>병원 연락처<input type="tel" value={hospitalPhone} maxLength={30} onChange={e => setHospitalPhone(e.target.value)} /></label>
              </>
            ) : (
              <p className={styles.readValue}>{hospitalLine ?? '등록된 정보가 없어요.'}</p>
            )}
          </section>

          <section className="demo-card">
            <h2 className={styles.sectionTitle}>활동지원센터</h2>
            {canEdit ? (
              <>
                <label className={styles.field}>활동지원센터명<input value={supportCenterName} maxLength={100} onChange={e => setSupportCenterName(e.target.value)} /></label>
                <label className={styles.field}>센터 담당자 이름<input value={supportCenterManagerName} maxLength={50} onChange={e => setSupportCenterManagerName(e.target.value)} /></label>
                <label className={styles.field}>센터 연락처<input type="tel" value={supportCenterPhone} maxLength={30} onChange={e => setSupportCenterPhone(e.target.value)} /></label>
              </>
            ) : (
              <p className={styles.readValue}>{centerLine ?? '등록된 정보가 없어요.'}</p>
            )}
          </section>

          {canEdit && (
            <>
              <button type="button" className="btn" disabled={saving} onClick={() => { void saveProfile(); }}>
                {saving ? '저장 중…' : '프로필 저장'}
              </button>
              {saved && <p className={styles.success} role="status">저장했어요.</p>}
            </>
          )}

          <section className="demo-card">
            <h2 className={styles.sectionTitle}>하루 루틴</h2>
            {routines.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>등록된 루틴이 없어요.</p>
            ) : (
              <ul className={styles.routineList}>
                {routines.map(routine => (
                  <li key={routine.id} className={styles.routineItem}>
                    <span className={styles.routineTime}>{routine.time}</span>
                    <div className={styles.routineBody}>
                      <p className={styles.routineTitle}>{routine.title}</p>
                      {routine.memo && <p className={styles.routineMemo}>{routine.memo}</p>}
                    </div>
                    {canEdit && (
                      <div className={styles.itemActions}>
                        <button type="button" className={styles.smallBtn} aria-label={`${routine.title} 수정`} onClick={() => startEdit(routine)}>수정</button>
                        <button type="button" className={`${styles.smallBtn} ${styles.danger}`} aria-label={`${routine.title} 삭제`} onClick={() => { void removeRoutine(routine); }}>삭제</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canEdit && (
              <>
                <label className={styles.field}>루틴 시간<input type="time" value={routineTime} onChange={e => setRoutineTime(e.target.value)} /></label>
                <label className={styles.field}>루틴 제목<input value={routineTitle} maxLength={100} onChange={e => setRoutineTitle(e.target.value)} placeholder="예: 아침 식사" /></label>
                <label className={styles.field}>루틴 메모<input value={routineMemo} maxLength={500} onChange={e => setRoutineMemo(e.target.value)} placeholder="선택" /></label>
                <div className={styles.formActions}>
                  <button type="button" className="btn" disabled={routineBusy} onClick={() => { void submitRoutine(); }}>
                    {editingId === null ? '루틴 추가' : '루틴 수정 완료'}
                  </button>
                  {editingId !== null && (
                    <button type="button" className="btn secondary" onClick={resetRoutineForm}>취소</button>
                  )}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
