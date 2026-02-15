'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { AdminSidebar } from './admin-sidebar'
import { AdminHeader } from './admin-header'
import { SearchCommand } from '@/components/admin/common/search-command'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  // Auth guard — redirect non-authenticated or non-staff users
  useEffect(() => {
    if (token === null) {
      // Wait for initial token load from localStorage
      const stored = localStorage.getItem('token')
      if (!stored) {
        router.replace('/login')
      }
    }
  }, [token, router])

  useEffect(() => {
    if (user && !user.is_staff) {
      router.replace('/')
    }
  }, [user, router])

  // Show nothing while checking auth
  if (!token) {
    return (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-background'>
        <div className='flex flex-col items-center gap-3'>
          <div className='h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent' />
          <p className='text-sm text-muted-foreground'>Loading...</p>
        </div>
      </div>
    )
  }

  if (user && !user.is_staff) {
    return (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-background'>
        <div className='text-center'>
          <h1 className='text-xl font-semibold'>Access Denied</h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            You do not have permission to access the admin area.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='fixed inset-0 z-50 flex bg-background'>
      <AdminSidebar collapsed={collapsed} />
      <div className='flex flex-1 flex-col overflow-hidden'>
        <AdminHeader
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((c) => !c)}
        />
        <main className='flex-1 overflow-y-auto'>
          <div className='p-6'>{children}</div>
        </main>
      </div>
      <SearchCommand />
    </div>
  )
}
