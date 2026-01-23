import type { Manuscript, ManuscriptImage } from '@/types/manuscript'
import { ManuscriptViewer } from './manuscript-viewer'
import { notFound } from 'next/navigation'

async function getManuscript(id: string): Promise<Manuscript> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/manuscripts/item-parts/${id}`
  )

  if (!response.ok) {
    if (response.status === 404) {
      notFound()
    }
    throw new Error('Failed to fetch manuscript')
  }

  return response.json()
}

async function getManuscriptImages(id: string): Promise<ManuscriptImage[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/manuscripts/item-images/?item_part=${id}`
  )

  if (!res.ok) {
    throw new Error('Failed to fetch manuscript images')
  }

  const data = await res.json()
  return data.results
}

export default async function ManuscriptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [manuscript, images] = await Promise.all([
    getManuscript(id),
    getManuscriptImages(id),
  ])
  return <ManuscriptViewer manuscript={manuscript} images={images} />
}
