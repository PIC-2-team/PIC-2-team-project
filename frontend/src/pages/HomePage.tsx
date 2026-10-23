import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listCareRecipients } from '../api/careRecipients';
import { getTodayRecords, getRecordSuggestions } from '../api/records';
import { getCareInfoOverview } from '../api/careInfo';
import type { CareRecipient } from '../types/careRecipient';
import type { DailyRecord } from '../types/record';
import { toSeoulDateKey } from '../utils/date';
import { UserProfileModal } from '../components/UserProfileModal';
import styles from './HomePage.module.css';


const ROLE_LABEL: Record<string, string> = {
  GUARDIAN: '돌봄 보호자',
  SUPPORT_WORKER: '활동지원사',
  INSTITUTION: '기관 담당자',
  ADMIN: '관리자',
};

const DISABILITY_MAP: Record<string, string> = {
  INTELLECTUAL: '지적장애',
  AUTISM: '자폐성 장애',
  BRAIN_LESION: '뇌병변장애',
  DEVELOPMENTAL: '발달장애',
  OTHER: '기타',
};

function formatDisability(type: string): string {
  return DISABILITY_MAP[type] ?? type;
}

function getAgeAndGender(birthDate?: string, gender?: 'MALE' | 'FEMALE'): string {
  const parts: string[] = [];
  if (birthDate) {
    const birthYear = parseInt(birthDate.slice(0, 4), 10);
    if (!isNaN(birthYear)) {
      const currentYear = new Date().getFullYear();
      parts.push(`${currentYear - birthYear}세`);
    }
  }
  if (gender === 'MALE') parts.push('남');
  else if (gender === 'FEMALE') parts.push('여');
  return parts.join(' · ');
}

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ok'; recipient: CareRecipient; todayRecords: DailyRecord[]; pinnedRecords: DailyRecord[] };

export function HomePage() {
  const { user, setSelectedRecipient } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState<PageState>({ status: 'loading' });
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [pendingSuggestionCount, setPendingSuggestionCount] = useState(0);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      navigate('/admin', { replace: true });
      return;
    }
    if (user?.role === 'INSTITUTION') {
      navigate('/agency', { replace: true });
      return;
    }
    const load = async () => {
      try {
        const recipients = await listCareRecipients();
        const first = recipients[0] ?? null;
        if (!first) {
          setPage({ status: 'empty' });
          return;
        }
        setSelectedRecipient(first.id);
        const [records, overview, suggestionsRes] = await Promise.all([
          getTodayRecords(first.id),
          getCareInfoOverview(first.id).catch(() => ({ categories: [], pinnedRecords: [] })),
          user?.role === 'GUARDIAN'
            ? getRecordSuggestions(first.id, 'PENDING').catch(() => null)
            : Promise.resolve(null),
        ]);
        if (suggestionsRes?.items) {
          setPendingSuggestionCount(suggestionsRes.items.length);
        }
        setPage({
          status: 'ok',
          recipient: first,
          todayRecords: records,
          pinnedRecords: overview.pinnedRecords ?? [],
        });
      } catch (e) {
        setPage({ status: 'error', message: e instanceof Error ? e.message : '불러오기 실패' });
      }
    };
    void load();
  }, [user?.role, navigate, setSelectedRecipient]);

  if (page.status === 'loading') return <div className="demo-page status-page"><p className="empty-state" role="status">불러오는 중…</p></div>;
  if (page.status === 'error') return <div className="demo-page status-page"><p className="error" role="alert">{page.message}</p></div>;
  if (page.status === 'empty') {
    const isSupportWorker = user?.role === 'SUPPORT_WORKER';
    return (
      <div className="demo-page status-page">
        <h1>안녕하세요, {user?.name}님!</h1>
        <div className="empty-state">
          {isSupportWorker ? (
            <p>아직 배정된 담당 이용자가 없어요.</p>
          ) : (
            <>
              <p>{user?.name}님, 당사자 정보를 먼저 등록해 주세요.</p>
              <button className="btn" type="button" onClick={() => navigate('/care-recipients/new')}>당사자 등록</button>
            </>
          )}
        </div>
      </div>
    );
  }

  const { recipient, todayRecords, pinnedRecords } = page;
  const canWrite = user?.role === 'GUARDIAN';

  return (
    <div className={styles.page}>
      <button
        type="button"
        className={styles.profileButton}
        onClick={() => setShowUserModal(true)}
        aria-label="내 프로필 정보 보기"
      >
        <div className={styles.avatar} aria-hidden="true">
          {Array.from(user?.name ?? '?')[0]}
        </div>
        <div className={styles.profileInfo}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>안녕하세요, {user?.name}님!</h1>
            {user?.role && <span className={styles.roleTag}>{ROLE_LABEL[user.role]}</span>}
          </div>
          <p className={styles.greeting}>오늘도 좋은 하루 보내세요! (프로필 보기 ›)</p>
        </div>
      </button>

      <section className={styles.recipientCard} aria-labelledby="assigned-recipient-title">
        <div className={styles.recipientHeader}>
          <span className={styles.assignedBadge}>
            {user?.role === 'SUPPORT_WORKER' ? '담당 이용자' : '돌봄 당사자'}
          </span>
          {recipient.careRecipientNumber && (
            <span className={styles.recipientNumber}>등록코드: {recipient.careRecipientNumber}</span>
          )}
        </div>

        <div className={styles.recipientMain}>
          <h2 id="assigned-recipient-title" className={styles.recipientName}>
            {recipient.name} 님
            {getAgeAndGender(recipient.birthDate, recipient.gender) && (
              <span className={styles.recipientSub}>
                ({getAgeAndGender(recipient.birthDate, recipient.gender)})
              </span>
            )}
          </h2>
        </div>

        <div className={styles.recipientDetails}>
          {recipient.disabilityTypes && recipient.disabilityTypes.length > 0 && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>장애 유형</span>
              <span className={styles.detailValue}>
                {recipient.disabilityTypes.map(formatDisability).join(', ')}
                {recipient.disabilityGrade ? ` (${recipient.disabilityGrade}급)` : ''}
              </span>
            </div>
          )}
          {recipient.birthDate && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>생년월일</span>
              <span className={styles.detailValue}>{recipient.birthDate}</span>
            </div>
          )}
          {user?.role === 'SUPPORT_WORKER' && recipient.guardianName && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>보호자</span>
              <span className={styles.detailValue}>
                {recipient.guardianName}
                {recipient.guardianPhone ? ` (${recipient.guardianPhone})` : ''}
              </span>
            </div>
          )}
        </div>

        <div className={styles.recipientActions}>
          <button
            type="button"
            className={styles.recipientActionBtn}
            onClick={() => setShowRecipientModal(true)}
          >
            📋 상세 설명 보기
          </button>
          <button
            type="button"
            className={`${styles.recipientActionBtn} ${styles.primaryActionBtn}`}
            onClick={() => navigate('/care-info')}
          >
            🌿 돌봄정보 확인
          </button>
        </div>
      </section>

      {canWrite && pendingSuggestionCount > 0 && (
        <section className={styles.section} aria-label="수정 제안 알림">
          <Link
            to="/record-suggestions"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: '#fffbeb',
              border: '1.5px solid #f59e0b',
              borderRadius: '12px',
              textDecoration: 'none',
              color: '#1f2937',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    background: '#f59e0b',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  수정 제안
                </span>
                <strong style={{ fontSize: '0.95rem', color: '#92400e' }}>
                  새로운 수정 제안이 {pendingSuggestionCount}건 있어요
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                활동지원사가 제안한 생활기록 내용을 확인하고 승인해 주세요.
              </p>
            </div>
            <span style={{ fontSize: '1.25rem', color: '#b45309', fontWeight: 'bold' }}>›</span>
          </Link>
        </section>
      )}

      {pinnedRecords.length > 0 && (
        <section className={styles.section} aria-labelledby="pinned-records-title">
          <div className={styles.sectionHeader}>
            <h2 id="pinned-records-title" className={styles.sectionTitle}>📌 중요 돌봄 정보</h2>
          </div>
          <div className={styles.records}>
            {pinnedRecords.map(record => (
              <Link key={record.id} to={`/records/${record.id}`} className={styles.recordCard}>
                <p className={styles.recordContent}>{record.content}</p>
                <span className={styles.recordTime}>
                  {toSeoulDateKey(record.recordedAt)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}


      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>오늘의 기록</h2>
          <button
            className={styles.viewAll}
            onClick={() => navigate('/records?view=list')}
            type="button"
          >
            전체보기 ›
          </button>
        </div>

        <div className={styles.records}>
          {todayRecords.length === 0 ? (
            <p>오늘 기록이 없어요.</p>
          ) : (
            todayRecords.map(record => (
              <Link key={record.id} to={`/records/${record.id}`} className={styles.recordCard}>
                <p className={styles.recordContent}>{record.content}</p>
                <span className={styles.recordTime}>
                  {new Date(record.recordedAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      {canWrite && (
        <button
          className={styles.recordButton}
          type="button"
          onClick={() => navigate('/records/new')}
        >
          기록하기
        </button>
      )}
      {showUserModal && (
        <UserProfileModal user={user} onClose={() => setShowUserModal(false)} />
      )}

      {showRecipientModal && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="assigned-recipient-modal-title"
          onClick={e => {
            if (e.target === e.currentTarget) setShowRecipientModal(false);
          }}
        >
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 id="assigned-recipient-modal-title" className={styles.modalTitle}>
                담당 이용자 상세 프로필
              </h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowRecipientModal(false)}
                aria-label="프로필 닫기"
              >
                ✕
              </button>
            </div>

            <div className={styles.recipientModalBody}>
              <div className={styles.modalAvatarCircle} aria-hidden="true">
                {Array.from(recipient.name ?? '?')[0]}
              </div>
              <h3 className={styles.modalRecipientName}>{recipient.name} 님</h3>
              {getAgeAndGender(recipient.birthDate, recipient.gender) && (
                <p className={styles.modalSub}>{getAgeAndGender(recipient.birthDate, recipient.gender)}</p>
              )}

              <div className={styles.infoList}>
                {recipient.careRecipientNumber && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>등록 번호</span>
                    <span className={styles.infoValue}>{recipient.careRecipientNumber}</span>
                  </div>
                )}
                {recipient.birthDate && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>생년월일</span>
                    <span className={styles.infoValue}>{recipient.birthDate}</span>
                  </div>
                )}
                {recipient.disabilityTypes && recipient.disabilityTypes.length > 0 && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>장애 유형</span>
                    <span className={styles.infoValue}>
                      {recipient.disabilityTypes.map(formatDisability).join(', ')}
                    </span>
                  </div>
                )}
                {recipient.disabilityGrade && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>장애 정도</span>
                    <span className={styles.infoValue}>{recipient.disabilityGrade}급</span>
                  </div>
                )}
                {recipient.guardianName && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>보호자</span>
                    <span className={styles.infoValue}>{recipient.guardianName}</span>
                  </div>
                )}
                {recipient.guardianPhone && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>보호자 연락처</span>
                    <span className={styles.infoValue}>{recipient.guardianPhone}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              className="btn"
              onClick={() => setShowRecipientModal(false)}
              style={{ width: '100%' }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
