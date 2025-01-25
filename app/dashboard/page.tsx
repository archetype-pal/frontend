'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from 'next-auth/react'

type UserProfile = {
  name?: string | null
  email?: string | null
  image?: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const session = await getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Assuming session contains profile data
      setProfile(session.user as UserProfile)
    }

    fetchProfile()
  }, [router])

  return (
    <div>
      <h1>Dashboard</h1>
      {profile && (
        <div>
          <h2>Profile</h2>
          <pre>{JSON.stringify(profile, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
