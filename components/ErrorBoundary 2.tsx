/**
 * Error Boundary Component for Adoras
 * Phase 3f: Catch React errors and display fallback UI
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { logError } from '../utils/errorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to error logger
    logError(error, 'critical', {
      componentStack: errorInfo.componentStack,
      type: 'react-error-boundary',
    });

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error('🚨 React Error Boundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              
              <h1 
                className="mb-2 text-primary" 
                style={{ fontFamily: 'Archivo', letterSpacing: '0.05em' }}
              >
                Something went wrong
              </h1>
              
              <p 
                className="text-muted-foreground mb-6"
                style={{ fontFamily: 'Inter' }}
              >
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>

              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left mb-6 p-4 bg-muted rounded-lg">
                  <summary 
                    className="cursor-pointer mb-2"
                    style={{ fontFamily: 'Inter' }}
                  >
                    Error details
                  </summary>
                  <div className="text-xs overflow-auto max-h-48">
                    <p className="text-red-600 dark:text-red-400 mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="text-muted-foreground whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  onClick={this.handleReset}
                  className="w-full"
                  style={{ fontFamily: 'Inter', letterSpacing: '0.025em' }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>

                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="w-full"
                  style={{ fontFamily: 'Inter', letterSpacing: '0.025em' }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="ghost"
                  className="w-full"
                  style={{ fontFamily: 'Inter', letterSpacing: '0.025em' }}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Button>
              </div>

              {/* Help text */}
              <p 
                className="text-xs text-muted-foreground mt-6"
                style={{ fontFamily: 'Inter' }}
              >
                If this problem persists, please contact support or try clearing your browser cache.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap any component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
