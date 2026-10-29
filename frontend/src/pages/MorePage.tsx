import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCareRecipient, listCareRecipients } from '../api/careRecipients';
import type { CareRecipient } from '../types/careRecipient';
import { UserProfileModal } from '../components/UserProfileModal';
import styles from './MorePage.module.css';

const ROLE_LABEL: Record<string, string> = {
  GUARDIAN: '돌봄 보호자',
  SUPPORT_WORKER: '활동지원사',
  INSTITUTION: '기관 담당자',
};

type MenuItem = {
  label: string;
  value?: string;
  to?: string;
  href?: string;
  pending?: boolean;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const BASE_MENU_SECTIONS: MenuSection[] = [
  {
    title: '서비스',
    items: [
      { label: '알림함', to: '/notifications' },
      { label: '서비스 이용약관', pending: true },
      { label: '개인정보처리방침', pending: true },
      { label: '오픈소스 라이선스', pending: true },
    ],
  },
  {
    title: '지원',
    items: [
      { label: '문의하기', href: 'mailto:contact@samgyeol.com' },
      { label: '앱 버전', value: '1.0.0' },
    ],
  },
];


function LogoutConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (ref.current?.showModal) {
      ref.current.showModal();
    }
    const el = ref.current;
    return () => {
      if (el?.close) {
        el.close();
      }
    };
  }, []);
  return (
    <dialog ref={ref} onCancel={onCancel} role="alertdialog" aria-labelledby="logout-title" aria-describedby="logout-desc">
      <h2 id="logout-title">로그아웃할까요?</h2>
      <p id="logout-desc">로그아웃 후 다시 로그인해야 합니다.</p>
      <div className="actions">
        <button className="btn secondary" onClick={onCancel}>
          취소
        </button>
        <button className="btn danger" onClick={onConfirm}>
          로그아웃
        </button>
      </div>
    </dialog>
  );
}

export function MorePage() {
  const { user, logout, selectedRecipientId, setSelectedRecipient } = useAuth();
  const navigate = useNavigate();
  const [recipients, setRecipients] = useState<CareRecipient[]>([]);
  const [recipientListError, setRecipientListError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'GUARDIAN' && user?.role !== 'SUPPORT_WORKER') return;
    let active = true;
    listCareRecipients().then(items => { if (active) setRecipients(items); })
      .catch(() => { if (active) setRecipientListError('당사자 목록을 불러오지 못했어요. 화면을 다시 열어 주세요.'); });
    return () => { active = false; };
  }, [user?.role]);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [recipient, setRecipient] = useState<CareRecipient | null>(null);
  const [loadingRecipient, setLoadingRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (showRecipientModal && selectedRecipientId) {
      setLoadingRecipient(true);
      setRecipientError(null);
      getCareRecipient(selectedRecipientId)
        .then(setRecipient)
        .catch((err) =>
          setRecipientError(err instanceof Error ? err.message : '당사자 정보를 불러오지 못했습니다.')
        )
        .finally(() => setLoadingRecipient(false));
    }
  }, [showRecipientModal, selectedRecipientId]);

  const handleLogoutConfirm = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const sections: MenuSection[] = [];

  if (user?.role === 'GUARDIAN') {
    sections.push({
      title: '돌봄 관리',
      items: [
        { label: '세컨드 보호자 관리', to: '/secondary-guardian' },
        { label: '돌봄 관계 관리', to: '/care-relations' },
      ],
    });
  }

  sections.push(...BASE_MENU_SECTIONS);

  return (
    <div className="demo-page">
      <h1>더보기</h1>

      <div className="demo-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          className={styles.avatarButton}
          onClick={() => setShowRecipientModal(true)}
          aria-label="돌봄 대상자 프로필 보기"
          title="돌봄 대상자 프로필 보기"
        >
          <div className={styles.avatar}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <circle cx="18" cy="14" r="7" fill="#b8c4ce" />
              <path d="M4 32c0-7.7 6.3-14 14-14s14 6.3 14 14" fill="#b8c4ce" />
            </svg>
          </div>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            type="button"
            onClick={() => setShowUserModal(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              textAlign: 'left',
              cursor: 'pointer',
              font: 'inherit',
              width: '100%',
            }}
            aria-label="내 프로필 정보 보기"
          >
            <p style={{ fontWeight: 700, margin: '0 0 2px', fontSize: '1rem', color: '#1a2533' }}>
              {user?.name ?? '—'}님
            </p>
            <p className="muted" style={{ margin: 0 }}>
              <span>{user ? (ROLE_LABEL[user.role] ?? user.role) : ''}</span>
              <span style={{ fontSize: '0.8125rem', color: '#3CAB7E', marginLeft: '6px' }}>프로필 보기 ›</span>
            </p>
            {user?.email && (
              <p className="muted" style={{ margin: 0, overflowWrap: 'anywhere' }}>
                {user.email}
              </p>
            )}
          </button>
        </div>
      </div>

      {recipientListError && <p role="alert" className="error">{recipientListError}</p>}
      {recipients.length > 1 && (
        <section className="demo-card">
          <h2>당사자 전환</h2>
          <p className="muted">선택한 당사자의 홈, 생활기록, 돌봄정보를 확인합니다.</p>
          <select aria-label="당사자 선택" value={selectedRecipientId ?? ''}
            onChange={event => {
              const id = Number(event.target.value);
              if (recipients.some(item => item.id === id)) setSelectedRecipient(id);
            }}>
            {selectedRecipientId === null && <option value="" disabled>당사자를 선택해 주세요</option>}
            {recipients.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </section>
      )}

      {showUserModal && (
        <UserProfileModal user={user} onClose={() => setShowUserModal(false)} />
      )}

      {showRecipientModal && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="recipient-profile-title"
        >
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 id="recipient-profile-title" className={styles.modalTitle}>
                돌봄 대상자 프로필
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


            {loadingRecipient ? (
              <p className="muted" role="status">당사자 정보를 불러오는 중입니다…</p>
            ) : recipientError ? (
              <p className="error" role="alert">{recipientError}</p>
            ) : !selectedRecipientId ? (
              <p className="muted">선택된 돌봄 대상자가 없습니다.</p>
            ) : recipient ? (
              <div
                className="demo-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  background: '#f8faf9',
                  border: '1px solid #d4ebdd',
                }}
              >
                <div className={styles.avatar} style={{ background: '#d5ede0' }}>
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                    <circle cx="18" cy="14" r="7" fill="#3CAB7E" />
                    <path d="M4 32c0-7.7 6.3-14 14-14s14 6.3 14 14" fill="#3CAB7E" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 2px', fontSize: '1.05rem', color: '#1a2533' }}>
                    {recipient.name} 님
                  </p>
                  <p className="tag" style={{ margin: '2px 0 6px' }}>돌봄 대상자</p>
                  {recipient.careRecipientNumber && (
                    <p className="muted" style={{ margin: '2px 0', fontSize: '0.85rem' }}>
                      식별 번호: <strong>{recipient.careRecipientNumber}</strong>
                    </p>
                  )}
                  {recipient.birthDate && (
                    <p className="muted" style={{ margin: '2px 0', fontSize: '0.85rem' }}>
                      생년월일: {recipient.birthDate}{' '}
                      {recipient.gender === 'MALE' ? '(남)' : recipient.gender === 'FEMALE' ? '(여)' : ''}
                    </p>
                  )}
                  {recipient.disabilityGrade && (
                    <p className="muted" style={{ margin: '2px 0', fontSize: '0.85rem' }}>
                      장애 정도: {recipient.disabilityGrade}급
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="muted">당사자 정보를 찾을 수 없습니다.</p>
            )}

            <button
              type="button"
              className="btn secondary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => setShowRecipientModal(false)}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {sections.map(section => (
        <div key={section.title}>
          <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>{section.title}</p>
          <div className="demo-card" style={{ padding: 0, gap: 0 }}>
            {section.items.map(item => (
              <button
                key={item.label}
                type="button"
                className="menu-link"
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', padding: '16px 20px' }}
                onClick={() => {
                  if (item.to) navigate(item.to);
                  else if (item.href) window.open(item.href, '_blank', 'noopener,noreferrer');
                  else if (item.pending) setToast('준비 중입니다.');
                }}
              >
                <span>{item.label}</span>
                {item.value
                  ? <span className="muted">{item.value}</span>
                  : <span style={{ color: 'var(--green)' }} aria-hidden="true">›</span>
                }
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn secondary"
        style={{ color: '#e05555', borderColor: '#f5c6c4' }}
        onClick={() => setShowLogoutDialog(true)}
      >
        로그아웃
      </button>

      <button
        type="button"
        className="btn secondary"
        style={{ color: '#e05555', borderColor: '#f5c6c4', marginTop: '0.5rem' }}
        onClick={() => setToast('회원 탈퇴 기능은 준비 중입니다.')}
      >
        회원 탈퇴
      </button>

      {showLogoutDialog && (
        <LogoutConfirmDialog
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutDialog(false)}
        />
      )}

      {toast && <div role="status" className={styles.toast}>{toast}</div>}
    </div>
  );
}

