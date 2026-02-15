'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminShell } from '@/components/admin/layout/admin-shell'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data fresh for 30 seconds — suits admin dashboards
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(getQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <AdminShell>{children}</AdminShell>
    </QueryClientProvider>
  )
}
