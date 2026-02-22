'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BackofficeShell } from '@/components/backoffice/layout/backoffice-shell'
import { BackofficeErrorBoundary } from '@/components/backoffice/common/error-boundary'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data fresh for 30 seconds — suits backoffice dashboards
        staleTime: 30 * 1000,
        // Re-fetch on window focus so admins see latest data
        refetchOnWindowFocus: true,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new client
    return makeQueryClient()
  }
  // Browser: reuse the same client
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}

export default function BackofficeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(getQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <BackofficeErrorBoundary>
        <BackofficeShell>{children}</BackofficeShell>
      </BackofficeErrorBoundary>
    </QueryClientProvider>
  )
}
