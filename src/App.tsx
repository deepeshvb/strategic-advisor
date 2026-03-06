import { Component, ErrorInfo, ReactNode } from 'react';
import { ConfigDashboard } from './components/ConfigDashboard';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: string }> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#111', color: '#ef4444', padding: 24, fontFamily: 'sans-serif' }}>
          <h1>Something went wrong</h1>
          <pre style={{ marginTop: 16, overflow: 'auto' }}>{this.state.error}</pre>
          <button onClick={() => this.setState({ hasError: false })} style={{ marginTop: 16, padding: '8px 16px' }}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <ConfigDashboard />
    </ErrorBoundary>
  );
}

export default App;
