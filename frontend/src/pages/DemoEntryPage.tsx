import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from '../components/AppShell';
import logoImg from '../assets/logo.png';
import styles from './DemoEntryPage.module.css';

type RoleOption = {
  label: string;
  desc: string;
  email: string;
  home: string;
};

const ROLES: RoleOption[] = [
  {
    label: '돌봄 보호자',
    desc: '기록 작성·수정, 접근 권한 관리',
    email: 'guardian@test.com',
    home: '/home',
  },
  {
    label: '활동지원사',
    desc: '기록 열람, 수정 제안',
    email: 'worker@test.com',
    home: '/home',
  },
  {
    label: '기관 담당자',
    desc: '배정 관리, 당사자·지원사 현황',
    email: 'institution@test.com',
    home: '/agency',
  },
];

const DEMO_PASSWORD = 'Test1234!';

export function DemoEntryPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (role: RoleOption) => {
    setLoading(role.email);
    setError(null);
    try {
      await login(role.email, DEMO_PASSWORD);
      navigate(role.home, { replace: true });
    } catch {
      setError('서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppShell>
      <main className={styles.page}>
        <div className={styles.content}>
          <section className={styles.hero}>
            <img src={logoImg} alt="삶결 로고" className={styles.logo} />
            <div className={styles.brandRow}>
              <span className={styles.brandName}>삶결</span>
              <span className={styles.divider} aria-hidden="true">·</span>
              <span className={styles.slogan}>삶의 결을 잇다</span>
            </div>
            <p className={styles.demoLabel}>데모</p>
          </section>

          <section className={styles.roleSection}>
            <h2 className={styles.question}>어떤 역할로 체험하시겠어요?</h2>
            <p className={styles.hint}>역할마다 볼 수 있는 정보와 기능이 달라요</p>

            <div className={styles.roleList}>
              {ROLES.map((role) => (
                <button
                  key={role.email}
                  className={styles.roleBtn}
                  onClick={() => { void handleSelect(role); }}
                  disabled={loading !== null}
                  aria-busy={loading === role.email}
                >
                  {loading === role.email ? (
                    <span className={styles.loadingWrap}>
                      <span className={styles.spinner} aria-hidden="true" />
                      <span>로그인 중…</span>
                    </span>
                  ) : (
                    <>
                      <span className={styles.roleLabel}>{role.label}</span>
                      <span className={styles.roleDesc}>{role.desc}</span>
                    </>
                  )}
                </button>
              ))}
            </div>

            {error && (
              <p role="alert" className={styles.error}>{error}</p>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
