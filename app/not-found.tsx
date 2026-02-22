import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <main className='flex min-h-[60vh] items-center justify-center p-8'>
      <div className='text-center max-w-md'>
        <h1 className='text-6xl font-bold text-primary mb-4'>404</h1>
        <h2 className='text-xl font-semibold mb-2'>Page not found</h2>
        <p className='text-muted-foreground mb-8'>
          The page you are looking for does not exist, has been moved, or is
          temporarily unavailable.
        </p>
        <div className='flex flex-col sm:flex-row gap-3 justify-center'>
          <Button asChild>
            <Link href='/'>
              <Home className='h-4 w-4 mr-2' />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href='/search/manuscripts'>
              <Search className='h-4 w-4 mr-2' />
              Search
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
