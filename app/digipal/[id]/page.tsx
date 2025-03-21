import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { fetchManuscriptImage } from '@/services/manuscripts'
import { notFound } from 'next/navigation'

// Dynamically import the ManuscriptViewer component with no SSR
const ManuscriptViewer = dynamic(
  () => import('@/components/manuscript-viewer'),
  {
    ssr: false,
    loading: () => (
      <div className='flex h-screen items-center justify-center'>
        Loading manuscript viewer...
      </div>
    ),
  }
)

interface PageProps {
  params: {
    id: string
  }
}

async function ManuscriptPage({ params }: PageProps) {
  let manuscriptImage
  try {
    manuscriptImage = await fetchManuscriptImage(params.id)
    manuscriptImage.iiif_image = manuscriptImage.iiif_image + '/info.json'
  } catch (error) {
    console.error('Error fetching manuscript image:', error)
    notFound()
  }

  if (!manuscriptImage) {
    notFound()
  }

  console.log('=====', manuscriptImage)

  return <ManuscriptViewer imageId={params.id} initialData={manuscriptImage} />
}

export default function Page(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className='flex h-screen items-center justify-center'>
          Loading manuscript viewer...
        </div>
      }
    >
      <ManuscriptPage {...props} />
    </Suspense>
  )
}
