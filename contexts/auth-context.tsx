'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserProfile } from '@/utils/api'
import type { UserProfile } from '@/types'

interface AuthContextType {
  token: string | null
  user: UserProfile | null
  setToken: (token: string | null) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const router = useRouter()

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
    }
  }, [])

  useEffect(() => {
    async function fetchUserProfile() {
      if (token) {
        try {
          const profile = await getUserProfile(token)
          setUser(profile)
        } catch (error) {
          logout()
        }
      }
    }
    fetchUserProfile()
  }, [token])

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ token, user, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
