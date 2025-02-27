'use client'

import React from 'react'
import ManuscriptViewer from '@/components/manuscript-viewer'
// import { useRouter } from 'next/navigation'
// import { useState, useEffect } from 'react'
interface PageProps {
  params: {
    id: string
  }
}
export default function Page({ params }: PageProps) {
  // const router = useRouter()
  // const id = params.id
  // const [imageSrc, setImageSrc] = useState<string | null>(null)

  // useEffect(() => {
  //   if (id) {
  //     fetch(
  //       `${process.env.NEXT_PUBLIC_API_URL}/api/v1/manuscripts/item-images/${id}/`
  //     )
  //       .then((response) => response.json())
  //       .then((data) => {
  //         console.log('data', data)

  //         setImageSrc(data.iiif_image)
  //       })
  //       .catch(() => {
  //         setImageSrc('/path/to/fallback-image.jpg')
  //       })
  //   }
  // }, [id])

  console.log('params.id', params.id)

  return <ManuscriptViewer imageId={params.id} />
}
