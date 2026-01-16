'use client'

import React from 'react'
import ManuscriptViewer from '@/components/ManuscriptViewer'
interface PageProps {
  params: {
    id: string
  }
}
export default function Page({ params }: PageProps) {
  return <ManuscriptViewer imageId={params.id} />
}
