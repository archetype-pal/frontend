import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className='container mx-auto p-4 max-w-4xl'>
      <Skeleton className='h-4 w-32 mb-4' />
      <Skeleton className='h-10 w-3/4 mb-2' />
      <Skeleton className='h-5 w-48 mb-8' />
      <div className='space-y-3'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-5/6' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-3/4' />
      </div>
    </main>
  )
}
