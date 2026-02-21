'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser, getUserProfile } from '@/utils/api'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Eye, EyeOff, Loader2, User, Lock } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { token, user, setToken } = useAuth()

  useEffect(() => {
    if (token && user) {
      router.replace(user.is_staff ? '/backoffice' : '/')
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

      const profile = await getUserProfile(response.auth_token)
      router.push(profile.is_staff ? '/backoffice' : '/')
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex flex-1 items-center justify-center bg-linear-to-b from-background to-muted/40 px-4 py-16'>
      <Card className='w-full max-w-[420px] shadow-lg border-border/60'>
        <CardHeader className='space-y-3 pb-2 text-center'>
          <div className='mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10'>
            <Lock className='h-7 w-7 text-primary' />
          </div>
          <CardTitle className='text-2xl font-bold tracking-tight'>
            Welcome back
          </CardTitle>
          <CardDescription className='text-sm text-muted-foreground'>
            Sign in to access Models of Authority
          </CardDescription>
        </CardHeader>

        <CardContent className='pt-4'>
          <form onSubmit={handleSubmit} className='space-y-5'>
            {error && (
              <Alert variant='destructive' className='text-sm'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className='space-y-2'>
              <Label htmlFor='username' className='text-sm font-medium'>
                Username
              </Label>
              <div className='relative'>
                <User className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='username'
                  name='username'
                  type='text'
                  autoComplete='username'
                  autoFocus
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className='h-11 pl-10'
                  placeholder='Enter your username'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password' className='text-sm font-medium'>
                Password
              </Label>
              <div className='relative'>
                <Lock className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='password'
                  name='password'
                  type={showPassword ? 'text' : 'password'}
                  autoComplete='current-password'
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='h-11 pl-10 pr-10'
                  placeholder='Enter your password'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </button>
              </div>
            </div>

            <Button
              type='submit'
              className='w-full h-11 text-sm font-semibold'
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
