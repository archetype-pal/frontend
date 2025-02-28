'use client'

import React from 'react'
import ManuscriptViewer from '@/components/manuscript-viewer'
interface PageProps {
  params: {
    id: string
  }
}
export default function Page({ params }: PageProps) {
  return <ManuscriptViewer imageId={params.id} />
}
