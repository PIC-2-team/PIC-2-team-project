import type { User } from '../types/user';
import styles from './UserProfileModal.module.css';

const ROLE_LABEL: Record<string, string> = {
  GUARDIAN: '돌봄 보호자',
  SUPPORT_WORKER: '활동지원사',
  INSTITUTION: '기관 담당자',
  ADMIN: '관리자',
};

export function UserProfileModal({
  user,
  onClose,
}: {
  user: User | null;
  onClose: () => void;
}) {
  if (!user) return null;

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-title"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 id="user-profile-title" className={styles.modalTitle}>
            {ROLE_LABEL[user.role] ?? '사용자'} 정보
          </h2>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="프로필 닫기"
          >
            ✕
          </button>
        </div>

        <div className={styles.profileBody}>
          <div className={styles.avatarCircle} aria-hidden="true">
            {Array.from(user.name ?? '?')[0]}
          </div>
          <div className={styles.badgeWrap}>
            <span className={styles.roleBadge}>{ROLE_LABEL[user.role] ?? user.role}</span>
          </div>

          <h3 className={styles.userName}>{user.name} 님</h3>

          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>역할</span>
              <span className={styles.infoValue}>{ROLE_LABEL[user.role] ?? user.role}</span>
            </div>
            {user.publicCode && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>고유 식별코드</span>
                <span className={styles.infoValue}>{user.publicCode}</span>
              </div>
            )}
            {user.email && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>이메일</span>
                <span className={styles.infoValue}>{user.email}</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className="btn" onClick={onClose} style={{ width: '100%' }}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
