'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser, getUserProfile } from '@/utils/api'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { token, user, setToken } = useAuth()

  // Redirect already-authenticated users
  useEffect(() => {
    if (token && user) {
      router.replace(user.is_staff ? '/admin' : '/')
    }
  }, [token, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await loginUser(username, password)
      localStorage.setItem('token', response.auth_token)
      setToken(response.auth_token)

      // Fetch profile to check if staff, then redirect accordingly
      const profile = await getUserProfile(response.auth_token)
      router.push(profile.is_staff ? '/admin' : '/')
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
            Sign in to your account
          </h2>
        </div>
        <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
          <div className='rounded-md shadow-sm space-y-4'>
            <div>
              <Label htmlFor='username'>Username</Label>
              <Input
                id='username'
                name='username'
                type='text'
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className='appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm'
                placeholder='Enter your username'
              />
            </div>
            <div>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                name='password'
                type='password'
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm'
                placeholder='Enter your password'
              />
            </div>
          </div>

          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type='submit' className='w-full' disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
