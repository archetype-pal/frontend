'use client'

import { use } from 'react'
import { ManuscriptWorkspace } from '@/components/admin/manuscripts/manuscript-workspace'

export default function ManuscriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <ManuscriptWorkspace itemId={Number(id)} />
}
