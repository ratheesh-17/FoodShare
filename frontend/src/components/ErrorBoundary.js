import React from 'react';
import { Alert } from './UI';

/**
 * Error Boundary Component
 * Catches and displays errors within component tree
 */
export class ErrorBoundary extends React.Component {
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
        <div className="w-full h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full">
            <Alert
              variant="error"
              title="Something went wrong"
              dismissible={false}
            >
              <p className="mb-4 text-sm">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary text-sm w-full"
              >
                Reload Page
              </button>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
