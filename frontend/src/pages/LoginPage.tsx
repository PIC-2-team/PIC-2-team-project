import { AppShell } from '../components/AppShell';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api/client';
import { findEmail, resetPassword } from '../api/auth';
import styles from './LoginPage.module.css';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

export function LoginPage() {
  const { user, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      const redirect = searchParams.get('redirect');
      const home = user.role === 'ADMIN' ? '/admin' : user.role === 'INSTITUTION' ? '/agency' : '/home';
      navigate(redirect ?? home, { replace: true });
    }
  }, [user, navigate, searchParams]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Account modal states
  const [modalTab, setModalTab] = useState<'email' | 'password' | null>(null);

  // Find email state
  const [findName, setFindName] = useState('');
  const [findPhone, setFindPhone] = useState('');
  const [foundEmail, setFoundEmail] = useState<string | null>(null);
  const [findError, setFindError] = useState<string | null>(null);
  const [findLoading, setFindLoading] = useState(false);

  // Reset password state
  const [resetName, setResetName] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const openModal = (tab: 'email' | 'password') => {
    setModalTab(tab);
    setFindError(null);
    setResetError(null);
    setFoundEmail(null);
    setResetSuccess(false);
  };

  const closeModal = () => {
    setModalTab(null);
  };

  const handleFindEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setFindLoading(true);
    setFindError(null);
    try {
      const res = await findEmail({ name: findName, phone: findPhone });
      setFoundEmail(res.email);
    } catch {
      setFindError('일치하는 회원 정보를 찾을 수 없어요. 이름과 전화번호를 확인해 주세요.');
    } finally {
      setFindLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('새 비밀번호가 일치하지 않아요.');
      return;
    }
    if (resetNewPassword.length < 8) {
      setResetError('비밀번호는 최소 8자 이상이어야 해요.');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    try {
      await resetPassword({
        name: resetName,
        phone: resetPhone,
        email: resetEmail,
        newPassword: resetNewPassword,
      });
      setResetSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'GOOGLE_ACCOUNT') {
        setResetError('Google 소셜 로그인으로 가입된 계정이에요. Google 로그인을 이용해 주세요.');
      } else {
        setResetError('회원 정보를 찾을 수 없거나 일치하지 않아요.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleCredential = async (idToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loginWithGoogle(idToken);
      if (!result.requiresConsent) {
        const home = result.user.role === 'ADMIN' ? '/admin' : result.user.role === 'INSTITUTION' ? '/agency' : '/home';
        navigate(searchParams.get('redirect') ?? home, { replace: true });
      } else {
        navigate('/consent', { replace: true, state: {
          pendingGoogle: {
            pendingToken: result.pendingToken,
            email: result.googleEmail,
            name: result.googleName,
          },
        }});
      }
    } catch {
      setError('Google 로그인 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // always points to the latest handleGoogleCredential so the GSI callback isn't stale
  const handleGoogleCredentialRef = useRef(handleGoogleCredential);
  useLayoutEffect(() => {
    handleGoogleCredentialRef.current = handleGoogleCredential;
  });

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) return;

    const initialize = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => { void handleGoogleCredentialRef.current(credential); },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: String(googleBtnRef.current.clientWidth || 280),
        text: 'signin_with',
        locale: 'ko',
      });
    };

    if (window.google) {
      initialize();
    } else {
      const script = document.querySelector<HTMLScriptElement>('script[src*="accounts.google.com/gsi/client"]');
      script?.addEventListener('load', initialize);
      return () => script?.removeEventListener('load', initialize);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      const redirect = searchParams.get('redirect');
      const home = user.role === 'ADMIN' ? '/admin' : user.role === 'INSTITUTION' ? '/agency' : '/home';
      navigate(redirect ?? home, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('이메일 또는 비밀번호가 올바르지 않아요.');
      } else {
        setError('로그인 중 오류가 발생했어요. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <main className={styles.page}>
        <div className={styles.content}>
          {/* 브랜드 히어로 섹션 */}
          <section className={styles.heroSection}>
            <div className={styles.heroLogoCircle} aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
                <path d="M20 6C12 6 6 12 6 20s6 14 14 14 14-6 14-14" stroke="#3CAB7E" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M20 6c4 0 7 5 7 14" stroke="#3CAB7E" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
                <circle cx="20" cy="20" r="4" fill="#3CAB7E" />
              </svg>
            </div>
            <div className={styles.heroBadge}>
              <span className={styles.brandName}>삶결</span>
              <span className={styles.badgeDivider} aria-hidden="true">·</span>
              <span className={styles.brandSlogan}>삶의 결을 잇다</span>
            </div>
            <h1 className={styles.heroTitle}>보호자가 없어도 이어지는 맞춤 돌봄 기록</h1>
            <p className={styles.heroDescription}>
              발달장애인 당사자의 일상과 특성을 안전하게 기록하고, 새로운 돌봄 제공자에게 따뜻하게 전달합니다.
            </p>
          </section>

          {/* 핵심 가치 3포인트 카드 */}
          <section className={styles.featuresSection} aria-label="주요 특징">
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrap} style={{ background: '#e8f5ee', color: '#2b825b' }}>
                🎙️
              </div>
              <div className={styles.featureText}>
                <h3 className={styles.featureTitle}>쉬운 일상 기록</h3>
                <p className={styles.featureDesc}>음성과 텍스트로 언제 어디서나 간편하게 남기는 생활 기록</p>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconWrap} style={{ background: '#e8f0fb', color: '#2e5cb8' }}>
                🤝
              </div>
              <div className={styles.featureText}>
                <h3 className={styles.featureTitle}>믿을 수 있는 연결</h3>
                <p className={styles.featureDesc}>보호자·활동지원사·기관의 빈틈없는 인수인계와 소통</p>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconWrap} style={{ background: '#fef3e6', color: '#b25e00' }}>
                🛡️
              </div>
              <div className={styles.featureText}>
                <h3 className={styles.featureTitle}>철저한 개인정보 보호</h3>
                <p className={styles.featureDesc}>주민번호 대신 전용 고유 코드로 민감정보 암호화 보관</p>
              </div>
            </div>
          </section>

          {/* 로그인 카드 섹션 */}
          <section className={styles.loginCard}>
            <div className={styles.heading}>
              <h2>로그인</h2>
              <p className={styles.subheading}>서비스 이용을 위해 로그인해 주세요</p>
            </div>

            <div className={styles.noticeCard}>
              <p className={styles.noticeText}>
                보안을 위해 로그인 상태는 이 브라우저에 저장되지 않습니다. 새로고침 후 다시 로그인해 주세요.
              </p>
            </div>

            <form className={styles.form} onSubmit={(e) => { void handleSubmit(e); }}>
              <label>
                이메일
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="example@samgyeol.com"
                  required
                />
              </label>
              <label>
                비밀번호
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="비밀번호 입력"
                  required
                />
              </label>
              {error && (
                <div role="alert" className={styles.errorAlert}>
                  <svg className={styles.alertIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              <button
                className={styles.submit}
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <span className={styles.loadingWrap}>
                    <span className={styles.spinner} aria-hidden="true" />
                    <span>로그인 중…</span>
                  </span>
                ) : (
                  '로그인'
                )}
              </button>
            </form>

            <div className={styles.findAccountLinks}>
              <button type="button" className={styles.textBtn} onClick={() => openModal('email')}>
                이메일 찾기
              </button>
              <span className={styles.linkDivider} aria-hidden="true">|</span>
              <button type="button" className={styles.textBtn} onClick={() => openModal('password')}>
                비밀번호 찾기
              </button>
            </div>

            <div className={styles.divider}>또는</div>

            <div ref={googleBtnRef} className={styles.googleButton} />

            <div className={styles.signupWrap}>
              <p className={styles.signup}>
                계정이 없으신가요?{' '}
                <Link to="/consent" className={styles.signupLink}>회원가입</Link>
              </p>
            </div>
          </section>
        </div>

        {modalTab && (
          <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="계정 찾기">
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  {modalTab === 'email' ? '이메일 찾기' : '비밀번호 재설정'}
                </h2>
                <button type="button" className={styles.closeBtn} onClick={closeModal} aria-label="닫기">
                  ✕
                </button>
              </div>
              <div className={styles.modalTabs}>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${modalTab === 'email' ? styles.activeTab : ''}`}
                  onClick={() => openModal('email')}
                >
                  이메일 찾기
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${modalTab === 'password' ? styles.activeTab : ''}`}
                  onClick={() => openModal('password')}
                >
                  비밀번호 재설정
                </button>
              </div>

              <div className={styles.modalBody}>
                {modalTab === 'email' && (
                  <>
                    {foundEmail ? (
                      <div className={styles.successBox}>
                        <p>가입된 계정의 이메일입니다.</p>
                        <strong className={styles.foundEmail}>{foundEmail}</strong>
                        <button
                          type="button"
                          className={styles.submit}
                          style={{ marginTop: '16px', width: '100%' }}
                          onClick={() => {
                            closeModal();
                          }}
                        >
                          로그인하러 가기
                        </button>
                      </div>
                    ) : (
                      <form className={styles.form} onSubmit={(e) => { void handleFindEmail(e); }}>
                        <label>
                          이름
                          <input
                            type="text"
                            value={findName}
                            onChange={(e) => setFindName(e.target.value)}
                            placeholder="가입 시 등록한 이름"
                            required
                          />
                        </label>
                        <label>
                          전화번호
                          <input
                            type="tel"
                            value={findPhone}
                            onChange={(e) => setFindPhone(e.target.value)}
                            placeholder="010-0000-0000"
                            required
                          />
                        </label>
                        {findError && <p role="alert" className={styles.error}>{findError}</p>}
                        <button className={styles.submit} type="submit" disabled={findLoading}>
                          {findLoading ? '조회 중…' : '이메일 조회'}
                        </button>
                      </form>
                    )}
                  </>
                )}

                {modalTab === 'password' && (
                  <>
                    {resetSuccess ? (
                      <div className={styles.successBox}>
                        <p>비밀번호가 성공적으로 변경되었습니다.</p>
                        <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--muted)' }}>
                          새로운 비밀번호로 로그인해 주세요.
                        </p>
                        <button
                          type="button"
                          className={styles.submit}
                          style={{ marginTop: '16px', width: '100%' }}
                          onClick={() => {
                            setEmail(resetEmail);
                            closeModal();
                          }}
                        >
                          로그인하러 가기
                        </button>
                      </div>
                    ) : (
                      <form className={styles.form} onSubmit={(e) => { void handleResetPassword(e); }}>
                        <label>
                          이름
                          <input
                            type="text"
                            value={resetName}
                            onChange={(e) => setResetName(e.target.value)}
                            placeholder="가입 시 등록한 이름"
                            required
                          />
                        </label>
                        <label>
                          전화번호
                          <input
                            type="tel"
                            value={resetPhone}
                            onChange={(e) => setResetPhone(e.target.value)}
                            placeholder="010-0000-0000"
                            required
                          />
                        </label>
                        <label>
                          이메일
                          <input
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="example@samgyeol.com"
                            required
                          />
                        </label>
                        <label>
                          새 비밀번호
                          <input
                            type="password"
                            value={resetNewPassword}
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            placeholder="8자 이상 입력"
                            autoComplete="new-password"
                            required
                          />
                        </label>
                        <label>
                          새 비밀번호 확인
                          <input
                            type="password"
                            value={resetConfirmPassword}
                            onChange={(e) => setResetConfirmPassword(e.target.value)}
                            placeholder="새 비밀번호 다시 입력"
                            autoComplete="new-password"
                            required
                          />
                        </label>
                        {resetError && <p role="alert" className={styles.error}>{resetError}</p>}
                        <button className={styles.submit} type="submit" disabled={resetLoading}>
                          {resetLoading ? '변경 중…' : '비밀번호 변경'}
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
