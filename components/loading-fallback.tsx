export function LoadingFallback() {
  return (
    <div className='absolute inset-0 flex h-full w-full items-center justify-center bg-gray-100'>
      <div className='text-center'>
        <div className='mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary mx-auto'></div>
        <p className='text-lg font-medium'>Loading viewer...</p>
        <p className='text-sm text-gray-500'>
          Please wait while we initialize the manuscript viewer
        </p>
      </div>
    </div>
  )
}
