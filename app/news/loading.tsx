import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className='container mx-auto p-4 max-w-4xl'>
      <Skeleton className='h-10 w-48 mb-6' />
      <div className='space-y-4'>
        {[...Array(5)].map((_, i) => (
          <div key={i} className='space-y-2'>
            <Skeleton className='h-6 w-2/3' />
            <Skeleton className='h-4 w-1/3' />
          </div>
        ))}
      </div>
    </main>
  )
}
