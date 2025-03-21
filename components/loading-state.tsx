export function LoadingState() {
  return (
    <div className='absolute inset-0 flex items-center justify-center bg-white/80'>
      <div className='text-center'>
        <div className='mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent'></div>
        <p className='text-sm text-gray-600'>Loading image...</p>
      </div>
    </div>
  )
}
