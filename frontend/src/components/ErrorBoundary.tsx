import '../styles/design-system.css';
import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell"><main className="demo-page status-page">
          <h1>다시 시도해주세요</h1>
          <p role="alert" className="error">
            예상치 못한 오류가 발생했어요.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="btn"
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = '/home'; }}
            className="btn"
            style={{ marginTop: '0.5rem' }}
          >
            홈으로 이동
          </button>
        </main></div>
      );
    }
    return this.props.children;
  }
}
