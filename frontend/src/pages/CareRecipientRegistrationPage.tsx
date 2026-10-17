import { AppShell } from '../components/AppShell';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCareRecipient } from '../api/careRecipients';
import { useAuth } from '../contexts/AuthContext';
import type { CreateCareRecipientPayload } from '../api/careRecipients';
import styles from './CareRecipientRegistrationPage.module.css';

const DISABILITIES: { value: CreateCareRecipientPayload['disabilityTypes'][number]; label: string }[] = [
  { value: 'INTELLECTUAL', label: '지적 장애' },
  { value: 'AUTISM', label: '자폐성 장애' },
  { value: 'OTHER', label: '그 외 장애' },
];

export function CareRecipientRegistrationPage() {
  const { setSelectedRecipient, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<CreateCareRecipientPayload['gender'] | ''>('');
  const [disabilityTypes, setDisabilityTypes] = useState<CreateCareRecipientPayload['disabilityTypes']>([]);
  const [disabilityGrade, setDisabilityGrade] = useState('');
  const [otherDisabilityType, setOtherDisabilityType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleDisability = (value: CreateCareRecipientPayload['disabilityTypes'][number]) => {
    setDisabilityTypes(current => current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value]);
  };

  const submit = async () => {
    if (!disabilityTypes.length) {
      setError('장애 유형을 하나 이상 선택해 주세요.');
      return;
    }
    if (disabilityTypes.includes('OTHER') && !otherDisabilityType.trim()) {
      setError('장애 유형을 입력해 주세요.');
      return;
    }
    const grade = disabilityGrade.trim() ? Number(disabilityGrade) : null;
    if (grade !== null && !Number.isInteger(grade)) {
      setError('장애 정도는 정수로 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const recipient = await createCareRecipient({
        name: name.trim(), birthDate, gender: gender as CreateCareRecipientPayload['gender'],
        disabilityTypes, disabilityGrade: grade,
        otherDisabilityType: disabilityTypes.includes('OTHER') ? otherDisabilityType.trim() : null,
      });
      setSelectedRecipient(recipient.id);
      navigate('/home', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : '등록 중 오류가 발생했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell role={user?.role}>
      <main className={styles.page}>
        <header className={styles.header}>
          <button className={styles.back} type="button" onClick={() => step === 2 ? setStep(1) : navigate(-1)} aria-label="뒤로가기">‹</button>
          <p className={styles.step}>당사자 등록 · {step} / 2</p>
        </header>
        <div className={styles.progress} role="progressbar" aria-label="당사자 등록 진행" aria-valuemin={1} aria-valuemax={2} aria-valuenow={step}><span style={{ width: step === 1 ? '50%' : '100%' }} /></div>
        <section className={styles.content}>
          {step === 1 ? (
            <>
              <p className={styles.eyebrow}>함께 돌볼 분의 정보를 알려주세요</p>
              <h1>당사자 기본 정보</h1>
              <label className={styles.field}>이름<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="이름을 입력해 주세요" /></label>
              <label className={styles.field}>생년월일<input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} /></label>
              <fieldset className={styles.gender}>
                <legend>성별</legend>
                <label><input type="radio" name="gender" value="MALE" checked={gender === 'MALE'} onChange={() => setGender('MALE')} /> 남성</label>
                <label><input type="radio" name="gender" value="FEMALE" checked={gender === 'FEMALE'} onChange={() => setGender('FEMALE')} /> 여성</label>
              </fieldset>
              <button className={styles.primary} type="button" disabled={!name.trim() || !birthDate || !gender} onClick={() => setStep(2)}>다음</button>
            </>
          ) : (
            <>
              <p className={styles.eyebrow}>필요한 돌봄을 준비하는 데 사용해요</p>
              <h1>장애 유형을 알려주세요</h1>
              <p className={styles.help}>해당하는 유형을 모두 선택해 주세요.</p>
              <div className={styles.options}>
                {DISABILITIES.map(item => <label className={styles.option} key={item.value}>
                  <input type="checkbox" checked={disabilityTypes.includes(item.value)} onChange={() => toggleDisability(item.value)} />
                  <span>{item.label}</span><span aria-hidden="true">✓</span>
                </label>)}
              </div>
              {disabilityTypes.includes('OTHER') && <label className={styles.field}>장애 유형<input value={otherDisabilityType} onChange={e => setOtherDisabilityType(e.target.value)} placeholder="장애 유형을 입력해 주세요" /></label>}
              <label className={styles.field}>장애 정도 <span className={styles.optional}>선택</span>
                <input type="number" inputMode="numeric" step={1} aria-label="장애 정도" value={disabilityGrade} onChange={e => setDisabilityGrade(e.target.value)} placeholder="숫자로 입력해 주세요" />
              </label>
              <p className={styles.privacy}>입력한 정보는 당사자 돌봄을 위해서만 사용돼요.</p>
              <button className={styles.primary} type="button" disabled={saving} onClick={() => { void submit(); }}>{saving ? '등록 중…' : '등록하기'}</button>
            </>
          )}
          {error && <p className={styles.error} role="alert">{error}</p>}
        </section>
      </main>
    </AppShell>
  );
}
