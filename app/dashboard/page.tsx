'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

export default function DashboardPage() {
  const router = useRouter()
  const { token, user } = useAuth()

  useEffect(() => {
    if (!token) {
      router.push('/login')
    }
  }, [token, router])

  if (!token) {
    return null
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {user && (
        <div>
          <h2>Profile</h2>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
