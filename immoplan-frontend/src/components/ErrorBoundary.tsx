import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { hasError: boolean };

/**
 * Intercepte les erreurs de rendu pour éviter l’écran blanc React Router par défaut.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            textAlign: 'center',
            gap: 16,
          }}
        >
          <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
            Un problème est survenu
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 420, margin: 0, lineHeight: 1.6 }}>
            L’affichage de cette partie de l’application a échoué. Vous pouvez recharger la page ou retourner à l’accueil.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-dim)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Recharger la page
            </button>
            <a
              href="/"
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-amber)',
                color: '#0A0A0F',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Accueil
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
