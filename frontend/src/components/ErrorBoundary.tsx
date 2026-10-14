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
        <main style={{ maxWidth: 390, margin: '4rem auto', padding: '2rem 1.25rem', textAlign: 'center' }}>
          <p role="alert" style={{ color: '#c0392b', marginBottom: '1.5rem' }}>
            예상치 못한 오류가 발생했어요.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{ padding: '0.875rem 2rem', background: '#3CAB7E', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            다시 시도
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
