import React from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { logger } from '../utils/logger';

// Simple error boundary for React components
export class ComponentErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      logger.error('Error caught by boundary:', error);
      logger.error('Component stack:', errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-3xl w-full bg-card border border-border rounded-lg p-6 text-center shadow-lg">
            <div className="text-6xl text-destructive mb-4">🚨</div>
            <h1 className="text-2xl font-bold text-card-foreground mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">{this.state.error?.message}</p>
            
            {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-card-foreground mb-2">
                  Show Stack Trace (Development)
                </summary>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto text-muted-foreground font-mono border border-border">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg transition-colors font-medium border border-border"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple route error boundary for React Router
export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-3xl w-full bg-card border border-border rounded-lg p-6 text-center shadow-lg">
          <div className="text-6xl text-destructive mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-card-foreground mb-2">
            {error.status} {error.statusText}
          </h1>
          <p className="text-muted-foreground mb-4">{error.data}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-3xl w-full bg-card border border-border rounded-lg p-6 text-center shadow-lg">
          <div className="text-6xl text-destructive mb-4">🚨</div>
          <h1 className="text-2xl font-bold text-card-foreground mb-4">Route Error</h1>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-3xl w-full bg-card border border-border rounded-lg p-6 text-center shadow-lg">
        <div className="text-6xl text-muted-foreground mb-4">❓</div>
        <h1 className="text-2xl font-bold text-card-foreground mb-4">Unknown Error</h1>
        <p className="text-muted-foreground mb-4">An unexpected error occurred.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};