import { notFound } from 'next/navigation'
import { ScribeViewer } from './scribe-viewer'
import type { ScribeDetail, ScribeHand } from '@/types/scribe-detail'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function getScribe(id: string): Promise<ScribeDetail> {
  const response = await fetch(`${API_BASE_URL}/api/v1/scribes/${id}/`)
  if (!response.ok) {
    if (response.status === 404) notFound()
    throw new Error('Failed to fetch scribe')
  }
  return response.json()
}

async function getScribeHands(scribeId: string): Promise<ScribeHand[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/hands/?scribe=${scribeId}`
  )
  if (!response.ok) return []
  const data = await response.json()
  return data.results ?? data ?? []
}

export default async function ScribePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [scribe, hands] = await Promise.all([
    getScribe(id),
    getScribeHands(id),
  ])

  return <ScribeViewer scribe={scribe} hands={hands} />
}
