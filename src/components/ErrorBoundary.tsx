import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h2>Something went wrong</h2>
          <p>The application encountered an unexpected error. Please try restarting the application.</p>
          <pre style={{
            margin: '20px',
            padding: '10px',
            background: 'rgba(0,0,0,0.05)',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
} 