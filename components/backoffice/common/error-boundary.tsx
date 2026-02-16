'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Global error boundary for the backoffice.
 * Catches render errors and shows a friendly recovery UI.
 */
export class BackofficeErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[BackofficeErrorBoundary]', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className='flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4'>
          <div className='rounded-full bg-destructive/10 p-4'>
            <AlertTriangle className='h-8 w-8 text-destructive' />
          </div>
          <div className='text-center space-y-1.5'>
            <h2 className='text-lg font-semibold'>Something went wrong</h2>
            <p className='text-sm text-muted-foreground max-w-md'>
              An unexpected error occurred while rendering this page. You can
              try again or navigate to a different section.
            </p>
          </div>
          {this.state.error && (
            <details className='max-w-lg w-full'>
              <summary className='text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors'>
                Error details
              </summary>
              <pre className='mt-2 rounded-md bg-muted p-3 text-xs overflow-auto max-h-32'>
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={this.handleReset}
              className='gap-1.5'
            >
              <RefreshCw className='h-3.5 w-3.5' />
              Try again
            </Button>
            <Button
              variant='default'
              size='sm'
              onClick={() => {
                this.handleReset()
                window.location.href = '/backoffice'
              }}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
