'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallbackUI({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  const t = useTranslations('backoffice');
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="text-center space-y-1.5">
        <h2 className="text-lg font-semibold">{t('errorBoundary.title')}</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {t('errorBoundary.description')}
        </p>
      </div>
      {error && (
        <details className="max-w-lg w-full">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            {t('errorBoundary.errorDetails')}
          </summary>
          <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-auto max-h-32">
            {error.message}
          </pre>
        </details>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          {t('errorBoundary.tryAgain')}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            onReset();
            window.location.href = '/backoffice';
          }}
        >
          {t('errorBoundary.goToDashboard')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Global error boundary for the backoffice.
 * Catches render errors and shows a friendly recovery UI.
 */
export class BackofficeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[BackofficeErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorFallbackUI error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}
