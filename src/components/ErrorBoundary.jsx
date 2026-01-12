import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F171E',
          color: '#E0E0E0',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: '2em', marginBottom: '20px', color: '#00A8E1' }}>
              Something went wrong
            </h1>
            <p style={{ marginBottom: '30px' }}>
              We're sorry for the inconvenience. Please refresh the page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#00A8E1',
                color: 'white',
                padding: '12px 32px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1em',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
