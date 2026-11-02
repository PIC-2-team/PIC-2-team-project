import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../api/notifications';
import type { NotificationItem, NotificationType } from '../types/notification';
import { UnreadNotificationSummaryCard } from '../components/UnreadNotificationSummaryCard';
import styles from './NotificationInboxPage.module.css';

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  RECORD_CREATED: '새 기록',
  RECORD_UPDATED: '기록 수정',
  ASSIGNMENT_CHANGED: '배정',
  SUGGESTION_RECEIVED: '수정 제안',
  SUGGESTION_DECIDED: '제안 결과',
  INFORMATION_REQUEST_RECEIVED: '정보 요청',
  RECORD_REQUEST_RECEIVED: '기록 요청',
  RECORD_FORWARDED: '기록 전달',
  ORGANIZATION_LINK_REQUESTED: '기관 연계',
};

function getDestination(type: NotificationType, role?: string): string {
  switch (type) {
    case 'SUGGESTION_RECEIVED':
    case 'SUGGESTION_DECIDED':
    case 'RECORD_CREATED':
    case 'RECORD_UPDATED':
      return '/records';
    case 'ASSIGNMENT_CHANGED':
      if (role === 'INSTITUTION') return '/agency';
      if (role === 'GUARDIAN') return '/care-relations';
      return '/home';
    case 'RECORD_REQUEST_RECEIVED':
      return '/records';
    case 'INFORMATION_REQUEST_RECEIVED':
      if (role === 'INSTITUTION') return '/agency';
      return '/home';
    case 'ORGANIZATION_LINK_REQUESTED':
      return role === 'INSTITUTION' ? '/agency' : '/care-relations';
    default:
      return role === 'INSTITUTION' ? '/agency' : '/home';
  }
}

function formatRelativeTime(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return '방금 전';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}일 전`;
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  } catch {
    return dateString;
  }
}

export function NotificationInboxPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'summary' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const canSummarize = user?.role === 'GUARDIAN'
    || user?.role === 'SUPPORT_WORKER'
    || user?.role === 'INSTITUTION';

  const fetchList = useCallback(async (currentFilter: 'all' | 'unread') => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotifications(
        currentFilter === 'unread' ? { read: false } : undefined
      );
      setNotifications(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알림 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== 'summary') fetchList(tab);
  }, [tab, fetchList]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setFeedback('모든 알림을 읽음 처리했습니다.');
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      // 갱신 재시도
      fetchList(tab === 'unread' ? 'unread' : 'all');
    }
  };

  const handleClickItem = async (item: NotificationItem) => {
    if (!item.read) {
      try {
        await markNotificationRead(item.id, true);
        setNotifications(prev =>
          prev.map(n => (n.id === item.id ? { ...n, read: true } : n))
        );
      } catch {
        // 읽음 실패해도 이동 진행
      }
    }
    const target = getDestination(item.type, user?.role);
    navigate(target);
  };

  const handleMarkUnread = async (id: number) => {
    setActionError(null);
    try {
      await markNotificationRead(id, false);
      setNotifications(prev => prev.map(item => (item.id === id ? { ...item, read: false } : item)));
      setFeedback('알림을 읽지 않음으로 표시했습니다.');
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setActionError('알림을 읽지 않음으로 표시하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleDeleteItem = async (id: number) => {
    setActionError(null);
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(item => item.id !== id));
      setFeedback('알림을 삭제했습니다.');
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setActionError('알림을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="demo-page">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>알림함</h1>
          {tab !== 'summary' && notifications.length > 0 && (
            <button
              type="button"
              className={styles.markAllBtn}
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              aria-label="모두 읽음 처리"
            >
              {unreadCount > 0 ? '모두 읽음 처리' : '모두 읽음 완료'}
            </button>
          )}
        </div>

        {feedback && (
          <div className={styles.feedbackBanner} role="status">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}
        {actionError && <p className="error" role="alert">{actionError}</p>}

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'all'}
            className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`}
            onClick={() => setTab('all')}
          >
            전체
          </button>
          {canSummarize && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'summary'}
              className={`${styles.tab} ${tab === 'summary' ? styles.tabActive : ''}`}
              onClick={() => setTab('summary')}
            >
              요약 리포트
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'unread'}
            className={`${styles.tab} ${tab === 'unread' ? styles.tabActive : ''}`}
            onClick={() => setTab('unread')}
          >
            읽지 않음
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
          </button>
        </div>

        {tab === 'summary' ? (
          <UnreadNotificationSummaryCard onSummaryGenerated={() => void fetchList('unread')} />
        ) : loading ? (
          <p className="muted" role="status">
            알림을 불러오는 중입니다…
          </p>
        ) : error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <p style={{ margin: 0 }}>도착한 알림이 없습니다.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {notifications.map(item => (
              <div className={styles.itemRow} key={item.id}>
                <button
                  type="button"
                  className={`${styles.item} ${!item.read ? styles.itemUnread : ''}`}
                  onClick={() => handleClickItem(item)}
                >
                  <div className={styles.itemHeader}>
                    <div className={styles.tagGroup}>
                      <span className={styles.typeTag}>
                        {NOTIFICATION_LABELS[item.type] ?? '알림'}
                      </span>
                      {!item.read && <span className={styles.newTag}>새 알림</span>}
                    </div>
                    <span className={styles.time}>{formatRelativeTime(item.createdAt)}</span>
                  </div>
                  <p className={styles.message}>{item.message}</p>
                </button>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  aria-label={`알림 삭제: ${item.message}`}
                  title="알림 삭제"
                  onClick={() => void handleDeleteItem(item.id)}
                >
                  ×
                </button>
                {item.read && (
                  <button
                    type="button"
                    className={styles.markUnreadBtn}
                    aria-label={`읽지 않음으로 표시: ${item.message}`}
                    onClick={() => void handleMarkUnread(item.id)}
                  >
                    읽지 않음
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
